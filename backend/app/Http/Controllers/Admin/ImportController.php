<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Component;
use App\Models\Conveyor;
use App\Models\Drum;
use App\Services\ConveyorExcelImporter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImportController extends Controller
{
    public function __construct(private ConveyorExcelImporter $importer)
    {
    }

    /**
     * POST /api/admin/import/preview
     * Upload an xlsx. Parse it (without persisting) and return the detected
     * conveyor groups so the admin can map each Inst to a conveyor code.
     */
    public function preview(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:20480'],
        ]);

        $token = Str::uuid()->toString();
        $stored = $request->file('file')->storeAs('imports', "{$token}.xlsx");
        $path = Storage::path($stored);

        $groups = $this->importer->parse($path, withImageData: false);

        return response()->json([
            'token'  => $token,
            'groups' => array_map(fn ($g) => [
                'inst_label' => $g['inst_label'],
                'guess_code' => $g['guess_code'],
                'drum_count' => count($g['drums']),
                'numeros'    => array_map(fn ($d) => $d['numero'], $g['drums']),
                'has_image'  => $g['image'] !== null,
            ], $groups),
        ]);
    }

    /**
     * POST /api/admin/import/commit
     * Body: { token, mappings: [{ inst_label, code, name?, family? }] }
     * Persists conveyors/drums/components idempotently (datasheets preserved).
     */
    public function commit(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token'                => ['required', 'string'],
            'mappings'             => ['required', 'array', 'min:1'],
            'mappings.*.inst_label'=> ['required', 'string'],
            'mappings.*.code'      => ['required', 'string', 'max:60', 'regex:/^[A-Za-z0-9_\-]+$/'],
            'mappings.*.name'      => ['nullable', 'string', 'max:255'],
            'mappings.*.family'    => ['nullable', 'string', 'max:60'],
        ]);

        $stored = 'imports/' . basename($validated['token']) . '.xlsx';
        abort_unless(Storage::exists($stored), 422, 'Import session expired — please re-upload.');

        $groups   = $this->importer->parse(Storage::path($stored), withImageData: true);
        $byInst   = [];
        foreach ($groups as $g) {
            $byInst[$g['inst_label']] = $g;
        }

        $result = [];

        DB::transaction(function () use ($validated, $byInst, &$result) {
            foreach ($validated['mappings'] as $map) {
                $group = $byInst[$map['inst_label']] ?? null;
                if ($group === null) {
                    continue;
                }
                $code = strtoupper($map['code']);

                $conveyor = Conveyor::updateOrCreate(
                    ['code' => $code],
                    [
                        'name'       => $map['name'] ?? $group['inst_label'],
                        'family'     => $map['family'] ?? $this->familyOf($code),
                        'inst_label' => $group['inst_label'],
                    ]
                );

                if ($group['image'] !== null && isset($group['image']['data'])) {
                    $ext  = $group['image']['ext'] ?: 'png';
                    $path = "conveyors/{$code}.{$ext}";
                    Storage::disk('public')->put($path, $group['image']['data']);
                    $conveyor->update([
                        'image_path'   => $path,
                        'image_width'  => $group['image']['width'] ?? null,
                        'image_height' => $group['image']['height'] ?? null,
                    ]);
                }

                foreach ($group['drums'] as $d) {
                    $drum = Drum::updateOrCreate(
                        ['conveyor_id' => $conveyor->id, 'numero' => $d['numero']],
                        [
                            'diametre'       => $d['diametre'],
                            'longueur'       => $d['longueur'],
                            'etat'           => $d['etat'],
                            'liaison_dynano' => $d['liaison_dynano'],
                            'liaison_anano'  => $d['liaison_anano'],
                            'liaison_etat'   => $d['liaison_etat'],
                        ]
                    );

                    $this->upsertComponent($drum, Component::KIND_ARBRE, $d['arbre']);
                    $this->upsertComponent($drum, Component::KIND_VIROLE, $d['virole']);
                }

                $result[] = ['code' => $code, 'drums' => count($group['drums'])];
            }
        });

        Storage::delete($stored);

        return response()->json([
            'message'   => 'Import terminé.',
            'conveyors' => $result,
        ]);
    }

    private function upsertComponent(Drum $drum, string $kind, array $data): void
    {
        $hasData = collect($data)->filter(fn ($v) => $v !== null && $v !== '')->isNotEmpty();
        if (! $hasData) {
            return;
        }

        Component::updateOrCreate(
            ['drum_id' => $drum->id, 'kind' => $kind],
            [
                'type_label' => $data['type_label'],
                'plan_koch'  => $data['plan_koch'],
                'plan_ocp'   => $data['plan_ocp'],
                'plan_key'   => Component::planKey($data['plan_koch']),
                'repere'     => $data['repere'],
                'etat'       => $data['etat'],
            ]
        );
    }

    private function familyOf(string $code): ?string
    {
        if (preg_match('/^([A-Z]+)/', $code, $m)) {
            return $m[1];
        }
        return null;
    }
}
