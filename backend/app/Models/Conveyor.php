<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'code',
    'name',
    'family',
    'inst_label',
    'characteristics',
    'image_path',
    'image_width',
    'image_height',
    'master_zone',
    'sort_order',
])]
class Conveyor extends Model
{
    protected function casts(): array
    {
        return [
            'characteristics' => 'array',
            'master_zone'     => 'array',
        ];
    }

    public function drums(): HasMany
    {
        return $this->hasMany(Drum::class)->orderBy('numero');
    }
}
