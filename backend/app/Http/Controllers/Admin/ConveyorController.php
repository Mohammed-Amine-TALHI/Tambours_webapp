<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Conveyor;
use App\Models\Drum;
use App\Services\ConveyorCharacteristicsImporter;
use App\Support\SchemaPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConveyorController extends Controller
{
    /**
     * GET /api/admin/conveyors/{conveyor}
     * Full detail for the admin editor: drums + components + their datasheets.
     */
    public function show(Conveyor $conveyor): JsonResponse
    {
        $conveyor->load(['drums.components.datasheets', 'drums.datasheets']);

        $data = SchemaPresenter::conveyorDetail($conveyor);
        $data['drums'] = $conveyor->drums->map(fn (Drum $d) => SchemaPresenter::drumDetail($d))->all();

        return response()->json(['conveyor' => $data]);
    }

    /**
     * PATCH /api/admin/conveyors/{conveyor}
     * Design editor (master zone shape) + info validation (name/family/characteristics).
     * Only the fields present in the request are updated.
     */
    public function update(Request $request, Conveyor $conveyor): JsonResponse
    {
        $validated = $request->validate([
            'name'                 => ['sometimes', 'nullable', 'string', 'max:255'],
            'family'               => ['sometimes', 'nullable', 'string', 'max:60'],
            'characteristics'      => ['sometimes', 'nullable', 'array'],

            'master_zone'          => ['sometimes', 'nullable', 'array'],
            'master_zone.type'     => ['required_with:master_zone', 'in:rect,ellipse,poly'],
            'master_zone.x'        => ['nullable', 'numeric', 'between:0,1'],
            'master_zone.y'        => ['nullable', 'numeric', 'between:0,1'],
            'master_zone.w'        => ['nullable', 'numeric', 'between:0,1'],
            'master_zone.h'        => ['nullable', 'numeric', 'between:0,1'],
            'master_zone.angle'    => ['nullable', 'numeric', 'between:-360,360'],
            'master_zone.points'   => ['nullable', 'array'],
        ]);

        $payload = [];
        foreach (['name', 'family', 'characteristics', 'master_zone'] as $key) {
            if ($request->exists($key)) {
                $payload[$key] = $validated[$key] ?? null;
            }
        }

        $conveyor->update($payload);

        return response()->json([
            'conveyor' => SchemaPresenter::conveyorSummary($conveyor->loadCount('drums')),
        ]);
    }

    /**
     * POST /api/admin/import/characteristics
     * Bulk-fill conveyor `characteristics` from a "caractéristiques" workbook.
     * Each existing (detected) conveyor is matched to a row by its code; only
     * those that match are updated. Existing characteristics are merged, with
     * the file's values taking precedence on identical labels.
     */
    public function importCharacteristics(Request $request, ConveyorCharacteristicsImporter $importer): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:20480'],
        ]);

        $map = $importer->parse($request->file('file')->getRealPath());

        $updated   = [];
        $unmatched = [];

        foreach (Conveyor::all() as $conveyor) {
            $key   = strtoupper(preg_replace('/\s+/', '', (string) $conveyor->code));
            $chars = $map[$key] ?? null;

            if (empty($chars)) {
                $unmatched[] = $conveyor->code;
                continue;
            }

            $conveyor->update([
                'characteristics' => array_merge($conveyor->characteristics ?? [], $chars),
            ]);
            $updated[] = ['code' => $conveyor->code, 'fields' => count($chars)];
        }

        return response()->json([
            'message'       => count($updated) . ' convoyeur(s) mis à jour.',
            'updated'       => $updated,
            'unmatched'     => $unmatched,        // detected conveyors with no row in the file
            'codes_in_file' => array_keys($map),  // for transparency
        ]);
    }
}
