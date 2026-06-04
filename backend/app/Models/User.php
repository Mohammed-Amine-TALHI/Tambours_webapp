<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'first_name',
    'last_name',
    'username',
    'email',
    'email_domain_id',
    'password',
    'role',
    'is_active',
    'must_change_password',
    'created_by',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * Available roles.
     */
    public const ROLE_ADMIN     = 'admin';
    public const ROLE_OPERATEUR = 'operateur';

    /**
     * Max failed login attempts before lockout.
     */
    public const MAX_FAILED_ATTEMPTS = 5;
    public const LOCKOUT_MINUTES     = 15;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password'             => 'hashed',
            'must_change_password' => 'boolean',
            'is_active'            => 'boolean',
            'last_login_at'        => 'datetime',
            'password_changed_at'  => 'datetime',
            'locked_until'         => 'datetime',
        ];
    }

    // ----- Relationships -------------------------------------------------

    public function emailDomain(): BelongsTo
    {
        return $this->belongsTo(EmailDomain::class, 'email_domain_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ----- Convenience methods ------------------------------------------

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isOperateur(): bool
    {
        return $this->role === self::ROLE_OPERATEUR;
    }

    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }
}
