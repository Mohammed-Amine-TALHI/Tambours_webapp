<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\MemoryDrawing;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Parses the "ETAT DES TAMBOURS -KOCH-" workbook (Tambour et virole *.xlsx).
 *
 * Layout (1-indexed columns), data starts at row 5:
 *   A=Inst (set only on the first row of each conveyor group)
 *   C=N°  D=Ø  E=L
 *   G=dynano bloc  H=anano bloc  I=liaison état
 *   K=type arbre  L=plan arbre KOCH  M=plan arbre OCP  N=repère arbre  O=état arbre
 *   Q=type virole R=plan virole KOCH S=plan virole OCP T=repère virole U=état virole
 *   V=état tambour
 * Each conveyor group has one embedded image (side view with numbered circles = drums).
 */
class ConveyorExcelImporter
{
    public const FIRST_DATA_ROW = 5;

    /**
     * Parse a workbook into conveyor groups.
     *
     * @return array<int, array{inst_label:string,start_row:int,end_row:int,guess_code:string,drums:array,image:?array}>
     */
    public function parse(string $path, bool $withImageData = false): array
    {
        $spreadsheet = IOFactory::load($path);
        $sheet       = $spreadsheet->getActiveSheet();
        $highestRow  = $sheet->getHighestDataRow();

        $groups  = [];
        $current = null;

        for ($row = self::FIRST_DATA_ROW; $row <= $highestRow; $row++) {
            $inst   = trim((string) $sheet->getCell("A{$row}")->getValue());
            $numero = $sheet->getCell("C{$row}")->getValue();

            if ($inst !== '') {
                if ($current !== null) {
                    $groups[] = $current;
                }
                $current = [
                    'inst_label' => $inst,
                    'start_row'  => $row,
                    'end_row'    => $row,
                    'guess_code' => $this->guessCode($inst),
                    'drums'      => [],
                    'image'      => null,
                ];
            }

            if ($current === null) {
                continue;
            }

            if ($numero === null || $numero === '') {
                continue;
            }

            $current['end_row'] = $row;
            $current['drums'][] = [
                'numero'         => (int) $numero,
                'diametre'       => $this->s($sheet, "D{$row}"),
                'longueur'       => $this->s($sheet, "E{$row}"),
                'etat'           => $this->s($sheet, "V{$row}"),
                'liaison_dynano' => $this->s($sheet, "G{$row}"),
                'liaison_anano'  => $this->s($sheet, "H{$row}"),
                'liaison_etat'   => $this->s($sheet, "I{$row}"),
                'arbre'          => [
                    'type_label' => $this->s($sheet, "K{$row}"),
                    'plan_koch'  => $this->s($sheet, "L{$row}"),
                    'plan_ocp'   => $this->s($sheet, "M{$row}"),
                    'repere'     => $this->s($sheet, "N{$row}"),
                    'etat'       => $this->s($sheet, "O{$row}"),
                ],
                'virole'         => [
                    'type_label' => $this->s($sheet, "Q{$row}"),
                    'plan_koch'  => $this->s($sheet, "R{$row}"),
                    'plan_ocp'   => $this->s($sheet, "S{$row}"),
                    'repere'     => $this->s($sheet, "T{$row}"),
                    'etat'       => $this->s($sheet, "U{$row}"),
                ],
            ];
        }

        if ($current !== null) {
            $groups[] = $current;
        }

        $this->attachImages($sheet, $groups, $withImageData);

        return $groups;
    }

    /**
     * Match each embedded drawing to the conveyor group it sits in
     * (the group with the greatest start_row that is <= the drawing's anchor row).
     */
    private function attachImages(Worksheet $sheet, array &$groups, bool $withImageData): void
    {
        foreach ($sheet->getDrawingCollection() as $drawing) {
            preg_match('/(\d+)/', $drawing->getCoordinates(), $m);
            $anchorRow = (int) ($m[1] ?? 0);

            $target = null;
            foreach ($groups as $i => $g) {
                if ($g['start_row'] <= $anchorRow) {
                    $target = $i;
                }
            }
            if ($target === null) {
                continue;
            }

            $meta = $this->imageMeta($drawing);
            if ($withImageData) {
                $meta['data'] = $this->imageBytes($drawing);
            }
            $groups[$target]['image'] = $meta;
        }
    }

    private function imageMeta($drawing): array
    {
        return [
            'width'  => $drawing->getWidth(),
            'height' => $drawing->getHeight(),
            'ext'    => $drawing instanceof MemoryDrawing ? 'png' : ($drawing->getExtension() ?: 'png'),
        ];
    }

    private function imageBytes($drawing): ?string
    {
        if ($drawing instanceof MemoryDrawing) {
            ob_start();
            call_user_func($drawing->getRenderingFunction(), $drawing->getImageResource());
            return ob_get_clean() ?: null;
        }
        if ($drawing instanceof Drawing) {
            $p = $drawing->getPath();
            return $p ? file_get_contents($p) : null;
        }
        return null;
    }

    private function s(Worksheet $sheet, string $coord): ?string
    {
        $v = $sheet->getCell($coord)->getValue();
        if ($v === null) {
            return null;
        }
        $v = $this->fixEncoding(trim((string) $v));
        return $v === '' ? null : $v;
    }

    /**
     * The source workbook lost its diacritics: both "Ø" and "é" were saved as
     * the replacement char (U+FFFD). Best-effort recovery by context:
     *   "�" followed by a digit  -> "Ø" (diameter, e.g. "�630" -> "Ø630")
     *   "�" otherwise            -> "é" (most common French letter here)
     */
    private function fixEncoding(string $v): string
    {
        $r = "\u{FFFD}";
        $v = preg_replace('/' . $r . '(?=\s*\d)/u', 'Ø', $v);
        return str_replace($r, 'é', $v);
    }

    /**
     * Best-effort conveyor code from the Inst label; admin can override.
     */
    private function guessCode(string $inst): string
    {
        $low = mb_strtolower($inst);
        if (str_contains($low, 'roue') || str_contains($low, 'pelle')) {
            return 'RP';
        }
        if (str_contains($low, 'stacker')) {
            return 'STACKER';
        }
        if (preg_match('/\b([tb]\s?\d+[a-z]?)\b/i', $inst, $m)) {
            return strtoupper(str_replace(' ', '', $m[1]));
        }
        return strtoupper(preg_replace('/[^a-z0-9]+/i', '_', $inst));
    }
}
