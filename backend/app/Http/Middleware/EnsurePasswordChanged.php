<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks any non-password-change endpoint until the user has changed their
 * one-time temp password. The /me and /password/change routes are exempt.
 */
class EnsurePasswordChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->must_change_password) {
            return response()->json([
                'message'                  => 'Password change required before continuing.',
                'must_change_password'     => true,
            ], 403);
        }

        return $next($request);
    }
}
