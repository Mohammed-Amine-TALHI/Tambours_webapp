<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'drum_id',
    'kind',
    'type_label',
    'plan_koch',
    'plan_ocp',
    'plan_key',
    'repere',
    'etat',
])]
class Component extends Model
{
    public const KIND_ARBRE  = 'arbre';
    public const KIND_VIROLE = 'virole';

    public function drum(): BelongsTo
    {
        return $this->belongsTo(Drum::class);
    }

    public function datasheets(): HasMany
    {
        return $this->hasMany(Datasheet::class);
    }

    /**
     * Normalize a plan reference so identical components match across drums.
     * Strips trailing "(n)" markers, collapses whitespace, removes separators.
     */
    public static function planKey(?string $plan): ?string
    {
        if ($plan === null) {
            return null;
        }
        $p = preg_replace('/\(.*?\)/', '', $plan);   // drop "(1)", "(2)" markers
        $p = preg_replace('/[\s.\-]+/', '', $p);     // drop spaces, dots, dashes
        $p = strtolower(trim($p));
        return $p === '' ? null : $p;
    }
}
