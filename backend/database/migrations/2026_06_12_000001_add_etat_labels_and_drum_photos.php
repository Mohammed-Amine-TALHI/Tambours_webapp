<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Personalised état vocabulary, managed by admins (label + badge tone).
        Schema::create('etat_labels', function (Blueprint $table) {
            $table->id();
            $table->string('label')->unique();
            $table->string('tone')->default('slate'); // emerald | amber | rose | slate
            $table->unsignedInteger('sort')->default(0);
            $table->timestamps();
        });

        // Photo shown at the centre of the printable drum fiche.
        Schema::table('drums', function (Blueprint $table) {
            $table->string('photo_path')->nullable();
        });

        // Seed the list from the états already present in the data so the
        // admin dropdowns keep matching existing rows.
        $existing = collect()
            ->merge(DB::table('drums')->whereNotNull('etat')->distinct()->pluck('etat'))
            ->merge(DB::table('drums')->whereNotNull('liaison_etat')->distinct()->pluck('liaison_etat'))
            ->merge(DB::table('components')->whereNotNull('etat')->distinct()->pluck('etat'))
            ->map(fn ($v) => trim((string) $v))
            ->filter()
            ->unique()
            ->values();

        $now = now();
        foreach ($existing as $i => $label) {
            DB::table('etat_labels')->insert([
                'label'      => $label,
                'tone'       => self::guessTone($label),
                'sort'       => $i,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('etat_labels');
        Schema::table('drums', function (Blueprint $table) {
            $table->dropColumn('photo_path');
        });
    }

    private static function guessTone(string $label): string
    {
        $l = mb_strtolower($label);
        if (preg_match('/neuf|bon|ok|disp/', $l)) {
            return 'emerald';
        }
        if (preg_match('/moyen|surveil|usinage|prép|prep/', $l)) {
            return 'amber';
        }
        if (preg_match('/mauvais|us[ée]|hs|d[ée]fect/', $l)) {
            return 'rose';
        }
        return 'slate';
    }
};
