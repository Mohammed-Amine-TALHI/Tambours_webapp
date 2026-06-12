<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Drum;
use App\Support\SchemaPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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

    /**
     * POST /api/admin/drums/{drum}/photo
     * Upload (or replace) the photo shown at the centre of the drum fiche.
     */
    public function storePhoto(Request $request, Drum $drum): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpeg,png,webp', 'max:8192'], // 8 Mo
        ]);

        $newPath = $request->file('photo')->store('drums', 'public');

        $oldPath = $drum->photo_path;
        $drum->photo_path = $newPath;
        $drum->save();

        // Remove the previous file only after the new one is recorded.
        if ($oldPath && $oldPath !== $newPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return response()->json(['photo_url' => SchemaPresenter::imageUrl($drum->photo_path)]);
    }

    /**
     * DELETE /api/admin/drums/{drum}/photo
     */
    public function destroyPhoto(Drum $drum): JsonResponse
    {
        if ($drum->photo_path) {
            Storage::disk('public')->delete($drum->photo_path);
            $drum->photo_path = null;
            $drum->save();
        }

        return response()->json(['message' => 'Photo supprimée.']);
    }
}
