<?php

namespace App\Http\Controllers;

use App\Models\Drum;
use App\Models\User;
use App\Support\SchemaPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DrumController extends Controller
{
    /**
     * GET /api/drums/{drum}
     * Zoomed drum detail: components + their datasheets.
     * États are admin-only and omitted for operators.
     */
    public function show(Request $request, Drum $drum): JsonResponse
    {
        $drum->load(['conveyor', 'components.datasheets', 'datasheets']);

        return response()->json([
            'drum' => SchemaPresenter::drumDetail(
                $drum,
                withEtat: $request->user()?->role === User::ROLE_ADMIN,
            ),
        ]);
    }
}
