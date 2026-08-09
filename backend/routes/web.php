<?php

use App\Http\Controllers\PublicStorageController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Only reached when the public/storage symlink is absent — see the controller.
Route::get('/storage/{path}', [PublicStorageController::class, 'show'])
    ->where('path', '.*');
