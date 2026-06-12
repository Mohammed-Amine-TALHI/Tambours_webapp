<?php

namespace App\Http\Controllers;

use App\Models\Component;
use App\Models\Conveyor;
use App\Models\Drum;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /**
     * GET /api/search?q=…
     * Global lookup for the command palette: conveyors by code/name,
     * drums by numero, components by type / plan KOCH / plan OCP.
     */
    public function search(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['conveyors' => [], 'drums' => [], 'components' => []]);
        }

        $like = '%' . str_replace(['%', '_'], ['\%', '\_'], $q) . '%';

        $conveyors = Conveyor::query()
            ->where('code', 'like', $like)
            ->orWhere('name', 'like', $like)
            ->orderBy('code')
            ->limit(6)
            ->get()
            ->map(fn (Conveyor $c) => [
                'id'   => $c->id,
                'code' => $c->code,
                'name' => $c->name,
            ]);

        // Drums match on their numero when the query is (or contains) a number.
        $drums = collect();
        if (preg_match('/(\d+)/', $q, $m)) {
            $drums = Drum::query()
                ->where('numero', (int) $m[1])
                ->with('conveyor')
                ->orderBy('conveyor_id')
                ->limit(8)
                ->get()
                ->map(fn (Drum $d) => [
                    'id'       => $d->id,
                    'numero'   => $d->numero,
                    'conveyor' => $d->conveyor ? ['id' => $d->conveyor->id, 'code' => $d->conveyor->code] : null,
                ]);
        }

        $components = Component::query()
            ->where(function ($query) use ($like) {
                $query->where('type_label', 'like', $like)
                    ->orWhere('plan_koch', 'like', $like)
                    ->orWhere('plan_ocp', 'like', $like)
                    ->orWhere('repere', 'like', $like);
            })
            ->with('drum.conveyor')
            ->limit(10)
            ->get()
            ->map(fn (Component $c) => [
                'id'         => $c->id,
                'kind'       => $c->kind,
                'type_label' => $c->type_label,
                'plan_koch'  => $c->plan_koch,
                'plan_ocp'   => $c->plan_ocp,
                'repere'     => $c->repere,
                'drum'       => $c->drum ? ['id' => $c->drum->id, 'numero' => $c->drum->numero] : null,
                'conveyor'   => $c->drum?->conveyor ? ['id' => $c->drum->conveyor->id, 'code' => $c->drum->conveyor->code] : null,
            ]);

        return response()->json([
            'conveyors'  => $conveyors,
            'drums'      => $drums->values(),
            'components' => $components,
        ]);
    }
}
