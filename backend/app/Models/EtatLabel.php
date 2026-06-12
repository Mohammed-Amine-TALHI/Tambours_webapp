<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * An admin-managed état value (label + badge tone) offered in the
 * drum-editing dropdowns. États are plain strings on drums/components;
 * this table only drives the vocabulary and its presentation.
 */
#[Fillable(['label', 'tone', 'sort'])]
class EtatLabel extends Model
{
    public const TONES = ['emerald', 'amber', 'rose', 'slate'];
}
