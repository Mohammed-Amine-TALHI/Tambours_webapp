<?php

namespace App\Http\Controllers;

use App\Models\Conveyor;
use App\Support\SchemaPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class SchemaController extends Controller
{
    public const MASTER_PATH = 'master/schema.png';
    public const MASTER_SVG  = 'master/schema.svg';

    /**
     * GET /api/schema/master
     * Returns the master installation schema image + every conveyor (with its
     * clickable zone, if the admin has drawn one) for the operator landing page.
     */
    public function master(): JsonResponse
    {
        $master = null;
        $disk   = Storage::disk('public');

        // Prefer the high-quality vector schema when present, fall back to the raster.
        if ($disk->exists(self::MASTER_SVG)) {
            [$w, $h] = $this->svgDimensions($disk->path(self::MASTER_SVG));
            $master = [
                'image_url' => $disk->url(self::MASTER_SVG),
                'width'     => $w,
                'height'    => $h,
            ];
        } elseif ($disk->exists(self::MASTER_PATH)) {
            $abs  = $disk->path(self::MASTER_PATH);
            $size = @getimagesize($abs);
            $master = [
                'image_url' => $disk->url(self::MASTER_PATH),
                'width'     => $size[0] ?? null,
                'height'    => $size[1] ?? null,
            ];
        }

        $conveyors = Conveyor::withCount('drums')
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get()
            ->map(fn (Conveyor $c) => SchemaPresenter::conveyorSummary($c));

        return response()->json([
            'master'    => $master,
            'conveyors' => $conveyors,
        ]);
    }

    /**
     * Read an SVG's intrinsic size from its viewBox (preferred) or width/height
     * attributes. getimagesize() can't read SVG, so we parse the opening tag.
     *
     * @return array{0: float|null, 1: float|null}
     */
    private function svgDimensions(string $absPath): array
    {
        $head = @file_get_contents($absPath, false, null, 0, 2048);
        if ($head === false) {
            return [null, null];
        }

        // viewBox="minX minY width height"
        if (preg_match('/viewBox\s*=\s*"\s*[\d.+-]+\s+[\d.+-]+\s+([\d.]+)\s+([\d.]+)/i', $head, $m)) {
            return [(float) $m[1], (float) $m[2]];
        }

        // Fallback: explicit width/height attributes
        if (preg_match('/\bwidth\s*=\s*"([\d.]+)/i', $head, $mw)
            && preg_match('/\bheight\s*=\s*"([\d.]+)/i', $head, $mh)) {
            return [(float) $mw[1], (float) $mh[1]];
        }

        return [null, null];
    }
}
