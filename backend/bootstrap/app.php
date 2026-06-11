<?php

use App\Http\Middleware\EnsurePasswordChanged;
use App\Http\Middleware\EnsureUserRole;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Trust the platform load balancer / Vercel proxy so Laravel reads
        // X-Forwarded-Proto and knows the request is HTTPS. Without this,
        // SESSION_SECURE_COOKIE cookies are never set behind a PaaS proxy and
        // login silently fails in production.
        $middleware->trustProxies(at: '*');

        // Sanctum SPA: ensures cookie + CSRF auth works for our React frontend
        $middleware->statefulApi();

        // Custom middleware aliases
        $middleware->alias([
            'role'             => EnsureUserRole::class,
            'password.changed' => EnsurePasswordChanged::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
