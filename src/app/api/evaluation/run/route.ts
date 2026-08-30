import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { executeEvaluationScenario, EVALUATION_RUNS_COLLECTION } from "@/lib/evaluation/runner";
import { INITIAL_EVALUATION_SCENARIOS } from "@/lib/evaluation/scenarios-definition";
import { EvaluationRun, EvaluationScenario, ScenarioId } from "@/lib/evaluation/schema";

export async function GET() {
  try {
    if (!adminDb) {
      return NextResponse.json({
        success: true,
        runs: [],
        latestRun: null,
        scenarios: INITIAL_EVALUATION_SCENARIOS,
      });
    }

    const runsSnap = await adminDb
      .collection(EVALUATION_RUNS_COLLECTION)
      .orderBy("startedAt", "desc")
      .limit(15)
      .get();

    const runs = runsSnap.docs.map((d) => d.data() as EvaluationRun);
    const latestRun = runs.length > 0 ? runs[0] : null;

    return NextResponse.json({
      success: true,
      runs,
      latestRun,
      scenarios: latestRun ? latestRun.scenarios : INITIAL_EVALUATION_SCENARIOS,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load evaluation history.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedScenarioId = body?.scenarioId as ScenarioId | "ALL" | undefined;

    const startTime = Date.now();
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const startedAt = new Date().toISOString();

    const scenariosToRun: ScenarioId[] =
      requestedScenarioId && requestedScenarioId !== "ALL"
        ? [requestedScenarioId]
        : (INITIAL_EVALUATION_SCENARIOS.map((s) => s.id) as ScenarioId[]);

    const executedScenarios: EvaluationScenario[] = [];

    // Run sequentially to prevent race conditions & Firestore concurrency conflicts
    for (const sId of scenariosToRun) {
      const result = await executeEvaluationScenario(sId);
      executedScenarios.push(result);
    }

    const passed = executedScenarios.filter((s) => s.status === "PASSED").length;
    const failed = executedScenarios.filter((s) => s.status === "FAILED").length;
    const errors = executedScenarios.filter((s) => s.status === "ERROR").length;
    const durationMs = Date.now() - startTime;
    const completedAt = new Date().toISOString();

    const firewallBlocks = executedScenarios.filter(
      (s) => s.actualOutcome?.pactFirewall?.includes("BLOCKED") || s.actualOutcome?.pactFirewall?.includes("REJECTED")
    ).length;

    const duplicatesPrevented = executedScenarios.filter(
      (s) => s.actualOutcome?.payment?.includes("DEDUPLICATED")
    ).length;

    const paymentFailures = executedScenarios.filter(
      (s) => s.actualOutcome?.payment?.includes("PAYMENT_FAILED")
    ).length;

    const evaluationRun: EvaluationRun = {
      runId,
      startedAt,
      completedAt,
      totalScenarios: executedScenarios.length,
      passed,
      failed,
      errors,
      durationMs,
      firewallBlocks,
      duplicatesPrevented,
      paymentFailures,
      scenarios: executedScenarios,
    };

    if (adminDb) {
      try {
        await adminDb.collection(EVALUATION_RUNS_COLLECTION).doc(runId).set(evaluationRun);
      } catch (dbErr) {
        console.warn("Failed to persist evaluation run:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      run: evaluationRun,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to execute evaluation.";
    console.error("[POST /api/evaluation/run] Error:", err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
