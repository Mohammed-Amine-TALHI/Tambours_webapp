<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'conveyor_id',
    'numero',
    'diametre',
    'longueur',
    'etat',
    'liaison_dynano',
    'liaison_anano',
    'liaison_etat',
    'circles',
])]
class Drum extends Model
{
    protected function casts(): array
    {
        return [
            'circles' => 'array',
        ];
    }

    public function conveyor(): BelongsTo
    {
        return $this->belongsTo(Conveyor::class);
    }

    public function components(): HasMany
    {
        return $this->hasMany(Component::class);
    }

    public function datasheets(): HasMany
    {
        return $this->hasMany(Datasheet::class);
    }
}
