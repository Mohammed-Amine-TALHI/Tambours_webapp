<?php

namespace App\Support;

use App\Models\Component;
use App\Models\Conveyor;
use App\Models\Datasheet;
use App\Models\Drum;
use Illuminate\Support\Facades\Storage;

/**
 * Shapes conveyor/drum/component/datasheet models for the frontend.
 * Centralised so operator + admin endpoints stay consistent.
 */
class SchemaPresenter
{
    public static function imageUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }
        // Relative URL — works via the Vite /storage proxy in dev and same-origin in prod.
        return Storage::disk('public')->url($path);
    }

    public static function conveyorSummary(Conveyor $c): array
    {
        return [
            'id'          => $c->id,
            'code'        => $c->code,
            'name'        => $c->name,
            'family'      => $c->family,
            'image_url'   => self::imageUrl($c->image_path),
            'master_zone' => $c->master_zone,
            'drum_count'  => $c->drums_count ?? $c->drums()->count(),
        ];
    }

    public static function conveyorDetail(Conveyor $c): array
    {
        return [
            'id'              => $c->id,
            'code'            => $c->code,
            'name'            => $c->name,
            'family'          => $c->family,
            'inst_label'      => $c->inst_label,
            'characteristics' => $c->characteristics,
            'image_url'       => self::imageUrl($c->image_path),
            'image_width'     => $c->image_width,
            'image_height'    => $c->image_height,
            'master_zone'     => $c->master_zone,
            'drums'           => $c->drums->map(fn (Drum $d) => self::drumSummary($d))->all(),
        ];
    }

    public static function drumSummary(Drum $d): array
    {
        return [
            'id'         => $d->id,
            'numero'     => $d->numero,
            'diametre'   => $d->diametre,
            'longueur'   => $d->longueur,
            'etat'       => $d->etat,
            'circles'    => $d->circles ?? [],
            'components'  => $d->relationLoaded('components')
                ? $d->components->map(fn (Component $cmp) => self::componentSummary($cmp))->all()
                : [],
        ];
    }

    public static function drumDetail(Drum $d): array
    {
        return [
            'id'             => $d->id,
            'numero'         => $d->numero,
            'diametre'       => $d->diametre,
            'longueur'       => $d->longueur,
            'etat'           => $d->etat,
            'liaison_dynano' => $d->liaison_dynano,
            'liaison_anano'  => $d->liaison_anano,
            'liaison_etat'   => $d->liaison_etat,
            'circles'        => $d->circles ?? [],
            'conveyor'       => $d->relationLoaded('conveyor') && $d->conveyor ? [
                'id'   => $d->conveyor->id,
                'code' => $d->conveyor->code,
                'name' => $d->conveyor->name,
            ] : null,
            'components'     => $d->components->map(fn (Component $c) => self::componentDetail($c))->all(),
            'datasheets'     => $d->relationLoaded('datasheets')
                ? $d->datasheets->map(fn (Datasheet $ds) => self::datasheet($ds))->all()
                : [],
        ];
    }

    public static function componentSummary(Component $c): array
    {
        return [
            'id'         => $c->id,
            'kind'       => $c->kind,
            'type_label' => $c->type_label,
            'plan_koch'  => $c->plan_koch,
            'plan_key'   => $c->plan_key,
            'repere'     => $c->repere,
            'etat'       => $c->etat,
        ];
    }

    public static function componentDetail(Component $c): array
    {
        return array_merge(self::componentSummary($c), [
            'plan_ocp'   => $c->plan_ocp,
            'datasheets' => $c->relationLoaded('datasheets')
                ? $c->datasheets->map(fn (Datasheet $ds) => self::datasheet($ds))->all()
                : [],
        ]);
    }

    public static function datasheet(Datasheet $ds): array
    {
        return [
            'id'            => $ds->id,
            'title'         => $ds->title,
            'original_name' => $ds->original_name,
            'mime'          => $ds->mime,
            'size'          => $ds->size,
            'download_url'  => "/api/datasheets/{$ds->id}/download",
            'created_at'    => $ds->created_at,
        ];
    }
}
