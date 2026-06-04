<?php

namespace App\Http\Controllers;

use App\Models\Conveyor;
use App\Support\SchemaPresenter;
use Illuminate\Http\JsonResponse;

class ConveyorController extends Controller
{
    /**
     * GET /api/conveyors
     * List for the master schema (operator landing page).
     */
    public function index(): JsonResponse
    {
        $conveyors = Conveyor::withCount('drums')
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get()
            ->map(fn (Conveyor $c) => SchemaPresenter::conveyorSummary($c));

        return response()->json(['conveyors' => $conveyors]);
    }

    /**
     * GET /api/conveyors/{conveyor}
     * Conveyor + its drums (with circles + component summary) for the
     * "click a conveyor" window.
     */
    public function show(Conveyor $conveyor): JsonResponse
    {
        $conveyor->load(['drums.components']);

        return response()->json([
            'conveyor' => SchemaPresenter::conveyorDetail($conveyor),
        ]);
    }
}
