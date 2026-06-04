<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'component_id',
    'drum_id',
    'title',
    'original_name',
    'file_path',
    'mime',
    'size',
    'uploaded_by',
])]
class Datasheet extends Model
{
    public function component(): BelongsTo
    {
        return $this->belongsTo(Component::class);
    }

    public function drum(): BelongsTo
    {
        return $this->belongsTo(Drum::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
