<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Fallback for /storage/* when the public/storage symlink is missing.
 *
 * The web server normally serves those files straight off the symlink and
 * this controller is never reached. But the symlink does not survive every
 * environment (OneDrive-synced checkouts replace it with an empty folder,
 * some deploys forget `artisan storage:link`), and a missing link silently
 * blanks every schema image, drum photo and printed fiche. Serving the file
 * from the public disk instead keeps images working either way.
 */
class PublicStorageController extends Controller
{
    public function show(string $path): StreamedResponse
    {
        // Reject traversal and absolute paths before touching the disk.
        abort_if(str_contains($path, '..') || str_starts_with($path, '/'), 404);
        abort_unless(Storage::disk('public')->exists($path), 404);

        return Storage::disk('public')->response($path, null, [
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}
