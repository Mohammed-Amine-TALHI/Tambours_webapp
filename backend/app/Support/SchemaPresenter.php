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
 *
 * État fields are reserved for admins: pass $withEtat = false on the
 * operator-facing endpoints so the values never leave the API.
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

    public static function conveyorDetail(Conveyor $c, bool $withEtat = true): array
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
            'drums'           => $c->drums->map(fn (Drum $d) => self::drumSummary($d, $withEtat))->all(),
        ];
    }

    public static function drumSummary(Drum $d, bool $withEtat = true): array
    {
        return [
            'id'         => $d->id,
            'numero'     => $d->numero,
            'diametre'   => $d->diametre,
            'longueur'   => $d->longueur,
            'etat'       => $withEtat ? $d->etat : null,
            'photo_url'  => self::imageUrl($d->photo_path),
            'circles'    => $d->circles ?? [],
            'components'  => $d->relationLoaded('components')
                ? $d->components->map(fn (Component $cmp) => self::componentSummary($cmp, $withEtat))->all()
                : [],
        ];
    }

    public static function drumDetail(Drum $d, bool $withEtat = true): array
    {
        return [
            'id'             => $d->id,
            'numero'         => $d->numero,
            'diametre'       => $d->diametre,
            'longueur'       => $d->longueur,
            'etat'           => $withEtat ? $d->etat : null,
            'liaison_dynano' => $d->liaison_dynano,
            'liaison_anano'  => $d->liaison_anano,
            'liaison_etat'   => $withEtat ? $d->liaison_etat : null,
            'photo_url'      => self::imageUrl($d->photo_path),
            'circles'        => $d->circles ?? [],
            'conveyor'       => $d->relationLoaded('conveyor') && $d->conveyor ? [
                'id'   => $d->conveyor->id,
                'code' => $d->conveyor->code,
                'name' => $d->conveyor->name,
            ] : null,
            'components'     => $d->components->map(fn (Component $c) => self::componentDetail($c, $withEtat))->all(),
            'datasheets'     => $d->relationLoaded('datasheets')
                ? $d->datasheets->map(fn (Datasheet $ds) => self::datasheet($ds))->all()
                : [],
        ];
    }

    public static function componentSummary(Component $c, bool $withEtat = true): array
    {
        return [
            'id'         => $c->id,
            'kind'       => $c->kind,
            'type_label' => $c->type_label,
            'plan_koch'  => $c->plan_koch,
            'plan_key'   => $c->plan_key,
            'repere'     => $c->repere,
            'etat'       => $withEtat ? $c->etat : null,
        ];
    }

    public static function componentDetail(Component $c, bool $withEtat = true): array
    {
        return array_merge(self::componentSummary($c, $withEtat), [
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
