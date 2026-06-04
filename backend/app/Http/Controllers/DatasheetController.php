<?php

namespace App\Http\Controllers;

use App\Models\Datasheet;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DatasheetController extends Controller
{
    /**
     * GET /api/datasheets/{datasheet}/download
     * Streams the stored file to authenticated users (operators + admins).
     */
    public function download(Datasheet $datasheet): StreamedResponse
    {
        abort_unless(Storage::disk('local')->exists($datasheet->file_path), 404);

        $name = $datasheet->original_name ?: ($datasheet->title . '.pdf');

        return Storage::disk('local')->download($datasheet->file_path, $name);
    }
}
