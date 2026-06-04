<?php

namespace App\Support;

/**
 * Generates a random temporary password that satisfies our StrongPassword rule.
 */
class PasswordGenerator
{
    public static function generate(int $length = 14): string
    {
        $upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';     // no I or O (ambiguous)
        $lower   = 'abcdefghijkmnpqrstuvwxyz';     // no l or o
        $digits  = '23456789';                     // no 0 or 1
        $symbols = '@#$%&*!?+=';

        // Guarantee at least one of each category
        $required = [
            $upper[random_int(0, strlen($upper) - 1)],
            $lower[random_int(0, strlen($lower) - 1)],
            $digits[random_int(0, strlen($digits) - 1)],
            $symbols[random_int(0, strlen($symbols) - 1)],
        ];

        $all = $upper . $lower . $digits . $symbols;
        $remaining = $length - count($required);
        for ($i = 0; $i < $remaining; $i++) {
            $required[] = $all[random_int(0, strlen($all) - 1)];
        }

        // Shuffle securely
        $chars = $required;
        for ($i = count($chars) - 1; $i > 0; $i--) {
            $j = random_int(0, $i);
            [$chars[$i], $chars[$j]] = [$chars[$j], $chars[$i]];
        }

        return implode('', $chars);
    }
}
