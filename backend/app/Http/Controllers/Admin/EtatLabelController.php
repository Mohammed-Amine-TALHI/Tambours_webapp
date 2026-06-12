<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EtatLabel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EtatLabelController extends Controller
{
    /** GET /api/admin/etats */
    public function index(): JsonResponse
    {
        return response()->json([
            'etats' => EtatLabel::orderBy('sort')->orderBy('label')->get(),
        ]);
    }

    /** POST /api/admin/etats */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'label' => ['required', 'string', 'max:255', 'unique:etat_labels,label'],
            'tone'  => ['sometimes', 'string', Rule::in(EtatLabel::TONES)],
        ]);

        $etat = EtatLabel::create([
            'label' => trim($validated['label']),
            'tone'  => $validated['tone'] ?? 'slate',
            'sort'  => (int) EtatLabel::max('sort') + 1,
        ]);

        return response()->json(['etat' => $etat], 201);
    }

    /** PATCH /api/admin/etats/{etatLabel} */
    public function update(Request $request, EtatLabel $etatLabel): JsonResponse
    {
        $validated = $request->validate([
            'label' => ['sometimes', 'string', 'max:255', Rule::unique('etat_labels', 'label')->ignore($etatLabel->id)],
            'tone'  => ['sometimes', 'string', Rule::in(EtatLabel::TONES)],
        ]);

        if (array_key_exists('label', $validated)) {
            $validated['label'] = trim($validated['label']);
        }
        $etatLabel->update($validated);

        return response()->json(['etat' => $etatLabel]);
    }

    /** DELETE /api/admin/etats/{etatLabel} */
    public function destroy(EtatLabel $etatLabel): JsonResponse
    {
        $etatLabel->delete();

        return response()->json(['message' => 'État supprimé.']);
    }
}
