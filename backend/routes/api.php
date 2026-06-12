<?php

use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\ConveyorController as AdminConveyorController;
use App\Http\Controllers\Admin\DatasheetController as AdminDatasheetController;
use App\Http\Controllers\Admin\DrumController as AdminDrumController;
use App\Http\Controllers\Admin\EmailDomainController;
use App\Http\Controllers\Admin\EtatLabelController;
use App\Http\Controllers\Admin\ImportController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ComponentController;
use App\Http\Controllers\ConveyorController;
use App\Http\Controllers\DatasheetController;
use App\Http\Controllers\DrumController;
use App\Http\Controllers\ForgotPasswordController;
use App\Http\Controllers\PasswordController;
use App\Http\Controllers\SchemaController;
use App\Http\Controllers\SearchController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public routes
|--------------------------------------------------------------------------
*/
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:6,1');   // 6 attempts/minute per IP

Route::get('/me', [AuthController::class, 'me']); // returns null if not logged in

// Forgot-password OTP flow (public, both rate-limited)
Route::post('/password/forgot', [ForgotPasswordController::class, 'request'])
    ->middleware('throttle:5,1');   // 5 forgot requests/min per IP
Route::post('/password/reset',  [ForgotPasswordController::class, 'reset'])
    ->middleware('throttle:10,1'); // 10 reset attempts/min per IP

/*
|--------------------------------------------------------------------------
| Authenticated routes
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    // First-login password change (exempt from password.changed middleware)
    Route::post('/password/change', [PasswordController::class, 'change']);

    // Anything below requires the password to already have been changed
    Route::middleware('password.changed')->group(function () {

        // Active email domains — needed by admin's create-user form
        Route::get('/email-domains', [EmailDomainController::class, 'active']);

        // ------ Schema consultation (operators + admins) ------
        Route::get('/search',                          [SearchController::class, 'search']);
        Route::get('/schema/master',                   [SchemaController::class, 'master']);
        Route::get('/conveyors',                       [ConveyorController::class, 'index']);
        Route::get('/conveyors/{conveyor}',            [ConveyorController::class, 'show']);
        Route::get('/drums/{drum}',                    [DrumController::class, 'show']);
        Route::get('/components/{component}/locations', [ComponentController::class, 'locations']);
        Route::get('/datasheets/{datasheet}/download', [DatasheetController::class, 'download']);

        // ------ Admin-only ------
        Route::middleware('role:admin')->prefix('admin')->group(function () {
            // Users
            Route::get   ('/users',                    [AdminUserController::class, 'index']);
            Route::post  ('/users',                    [AdminUserController::class, 'store']);
            Route::patch ('/users/{user}',             [AdminUserController::class, 'update']);
            Route::patch ('/users/{user}/reset-password', [AdminUserController::class, 'resetPassword']);
            Route::delete('/users/{user}',             [AdminUserController::class, 'destroy']);

            // Email domains
            Route::get  ('/email-domains',                 [EmailDomainController::class, 'index']);
            Route::post ('/email-domains',                 [EmailDomainController::class, 'store']);
            Route::patch('/email-domains/{emailDomain}',   [EmailDomainController::class, 'update']);

            // Excel import (conveyors / drums / components)
            Route::post('/import/preview', [ImportController::class, 'preview']);
            Route::post('/import/commit',  [ImportController::class, 'commit']);

            // Excel import — bulk conveyor characteristics (matched by code)
            Route::post('/import/characteristics', [AdminConveyorController::class, 'importCharacteristics']);

            // Personalised état vocabulary (labels + badge tones)
            Route::get   ('/etats',             [EtatLabelController::class, 'index']);
            Route::post  ('/etats',             [EtatLabelController::class, 'store']);
            Route::patch ('/etats/{etatLabel}', [EtatLabelController::class, 'update']);
            Route::delete('/etats/{etatLabel}', [EtatLabelController::class, 'destroy']);

            // Schema design editor — zones, conveyor info, drums, datasheets
            Route::get  ('/conveyors/{conveyor}', [AdminConveyorController::class, 'show']);
            Route::patch('/conveyors/{conveyor}', [AdminConveyorController::class, 'update']);
            Route::patch('/drums/{drum}',         [AdminDrumController::class, 'update']);
            Route::post  ('/drums/{drum}/photo',  [AdminDrumController::class, 'storePhoto']);
            Route::delete('/drums/{drum}/photo',  [AdminDrumController::class, 'destroyPhoto']);
            Route::post  ('/datasheets',              [AdminDatasheetController::class, 'store']);
            Route::delete('/datasheets/{datasheet}',  [AdminDatasheetController::class, 'destroy']);
        });
    });
});
