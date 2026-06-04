<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Drum;
use App\Support\SchemaPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DrumController extends Controller
{
    /**
     * PATCH /api/admin/drums/{drum}
     * Info validation: edit a drum's measured fields and (later) its circle marker.
     */
    public function update(Request $request, Drum $drum): JsonResponse
    {
        $validated = $request->validate([
            'diametre'       => ['sometimes', 'nullable', 'string', 'max:100'],
            'longueur'       => ['sometimes', 'nullable', 'string', 'max:100'],
            'etat'           => ['sometimes', 'nullable', 'string', 'max:255'],
            'liaison_dynano' => ['sometimes', 'nullable', 'string', 'max:255'],
            'liaison_anano'  => ['sometimes', 'nullable', 'string', 'max:255'],
            'liaison_etat'   => ['sometimes', 'nullable', 'string', 'max:255'],
            'circles'        => ['sometimes', 'nullable', 'array'],
            'circles.*.x'    => ['required', 'numeric', 'between:0,1'],
            'circles.*.y'    => ['required', 'numeric', 'between:0,1'],
            'circles.*.r'    => ['required', 'numeric', 'between:0,1'],
        ]);

        $drum->update($validated);
        $drum->load('components');

        return response()->json(['drum' => SchemaPresenter::drumSummary($drum)]);
    }
}
