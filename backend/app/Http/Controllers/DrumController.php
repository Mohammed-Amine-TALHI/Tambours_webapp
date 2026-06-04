<?php

namespace App\Http\Controllers;

use App\Models\Drum;
use App\Support\SchemaPresenter;
use Illuminate\Http\JsonResponse;

class DrumController extends Controller
{
    /**
     * GET /api/drums/{drum}
     * Zoomed drum detail: components + their datasheets.
     */
    public function show(Drum $drum): JsonResponse
    {
        $drum->load(['conveyor', 'components.datasheets', 'datasheets']);

        return response()->json([
            'drum' => SchemaPresenter::drumDetail($drum),
        ]);
    }
}
