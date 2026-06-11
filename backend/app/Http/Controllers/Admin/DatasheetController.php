<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Datasheet;
use App\Support\SchemaPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DatasheetController extends Controller
{
    /**
     * POST /api/admin/datasheets
     * Upload a datasheet file and attach it to a component OR a drum.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file'         => ['required', 'file', 'max:20480', 'mimes:pdf,png,jpg,jpeg,webp,doc,docx,xls,xlsx'],
            'title'        => ['nullable', 'string', 'max:255'],
            'component_id' => ['nullable', 'integer', 'exists:components,id', 'required_without:drum_id'],
            'drum_id'      => ['nullable', 'integer', 'exists:drums,id', 'required_without:component_id'],
        ]);

        $file = $request->file('file');
        $path = $file->store('datasheets'); // local (private) disk

        $ds = Datasheet::create([
            'component_id'  => $validated['component_id'] ?? null,
            'drum_id'       => $validated['drum_id'] ?? null,
            'title'         => ($validated['title'] ?? null)
                ?: pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
            'original_name' => $file->getClientOriginalName(),
            'file_path'     => $path,
            'mime'          => $file->getClientMimeType(),
            'size'          => $file->getSize(),
            'uploaded_by'   => $request->user()->id,
        ]);

        return response()->json(['datasheet' => SchemaPresenter::datasheet($ds)], 201);
    }

    /**
     * DELETE /api/admin/datasheets/{datasheet}
     */
    public function destroy(Datasheet $datasheet): JsonResponse
    {
        $path = $datasheet->file_path;

        // Delete the DB record first, then the file. A leftover file is
        // harmless (disk usage only), whereas a surviving record that points
        // at a missing file would surface to users as a broken download.
        $datasheet->delete();
        Storage::disk('local')->delete($path);

        return response()->json(['message' => 'Fiche supprimée.']);
    }
}
