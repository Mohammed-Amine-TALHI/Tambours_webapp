<?php

namespace App\Http\Controllers;

use App\Models\Datasheet;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DatasheetController extends Controller
{
    /**
     * GET /api/datasheets/{datasheet}/download
     *
     * Streams a stored datasheet. Access is intentionally any-authenticated-user
     * (operator or admin): the application model is that every operator may
     * consult every datasheet in the installation, so there is no per-resource
     * ownership to enforce. The route is already gated by `auth:sanctum` and
     * `password.changed`. If datasheets ever become access-scoped, add the
     * authorization check here.
     */
    public function download(Datasheet $datasheet): StreamedResponse
    {
        abort_unless(Storage::disk('local')->exists($datasheet->file_path), 404);

        $name = $datasheet->original_name ?: ($datasheet->title . '.pdf');

        // PDFs and images open inline in a browser tab (quicker to consult);
        // everything else (Word, Excel…) downloads as before.
        $inline = in_array($datasheet->mime, [
            'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
        ], true);

        if ($inline) {
            return Storage::disk('local')->response($datasheet->file_path, $name, [
                'Content-Disposition' => 'inline; filename="' . addslashes($name) . '"',
            ]);
        }

        return Storage::disk('local')->download($datasheet->file_path, $name);
    }
}
