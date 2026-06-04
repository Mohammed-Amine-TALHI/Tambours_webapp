<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A drum can have MORE THAN ONE marker on the conveyor image
     * (some pulleys share the same N°). Replace the single `circle`
     * {x,y,r} with `circles` — an array of {x,y,r}.
     */
    public function up(): void
    {
        Schema::table('drums', function (Blueprint $table) {
            $table->dropColumn('circle');
        });
        Schema::table('drums', function (Blueprint $table) {
            $table->json('circles')->nullable()->after('liaison_etat'); // [{x,y,r}, ...] normalized
        });
    }

    public function down(): void
    {
        Schema::table('drums', function (Blueprint $table) {
            $table->dropColumn('circles');
        });
        Schema::table('drums', function (Blueprint $table) {
            $table->json('circle')->nullable()->after('liaison_etat');
        });
    }
};
