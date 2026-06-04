<?php

namespace App\Http\Controllers;

use App\Models\Component;
use App\Support\SchemaPresenter;
use Illuminate\Http\JsonResponse;

class ComponentController extends Controller
{
    /**
     * GET /api/components/{component}/locations
     * Cross-reference: every drum/conveyor that uses the SAME component
     * (same kind + normalized plan key). This powers "hover a component ->
     * see all the places it is used in the chain".
     */
    public function locations(Component $component): JsonResponse
    {
        $matches = collect();

        if ($component->plan_key) {
            $matches = Component::query()
                ->where('kind', $component->kind)
                ->where('plan_key', $component->plan_key)
                ->with('drum.conveyor')
                ->get()
                ->map(fn (Component $c) => [
                    'component_id' => $c->id,
                    'kind'         => $c->kind,
                    'type_label'   => $c->type_label,
                    'plan_koch'    => $c->plan_koch,
                    'repere'       => $c->repere,
                    'etat'         => $c->etat,
                    'drum'         => $c->drum ? [
                        'id'      => $c->drum->id,
                        'numero'  => $c->drum->numero,
                        'circles' => $c->drum->circles ?? [],
                    ] : null,
                    'conveyor'     => $c->drum && $c->drum->conveyor ? [
                        'id'   => $c->drum->conveyor->id,
                        'code' => $c->drum->conveyor->code,
                        'name' => $c->drum->conveyor->name,
                    ] : null,
                ]);
        }

        return response()->json([
            'component' => SchemaPresenter::componentSummary($component),
            'count'     => $matches->count(),
            'locations' => $matches->values(),
        ]);
    }
}
