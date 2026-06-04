<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmailDomain;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EmailDomainController extends Controller
{
    /**
     * GET /api/admin/email-domains  (and /api/email-domains for use by login etc.)
     */
    public function index(): JsonResponse
    {
        $domains = EmailDomain::orderBy('domain')->get(['id', 'domain', 'label', 'is_active']);
        return response()->json(['domains' => $domains]);
    }

    /**
     * Public list — only active domains, used by the create-user form.
     */
    public function active(): JsonResponse
    {
        $domains = EmailDomain::where('is_active', true)
            ->orderBy('domain')
            ->get(['id', 'domain', 'label']);
        return response()->json(['domains' => $domains]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'domain' => ['required', 'string', 'max:180', 'regex:/^[a-z0-9.-]+\.[a-z]{2,}$/i', Rule::unique('email_domains', 'domain')],
            'label'  => ['nullable', 'string', 'max:180'],
        ]);

        $domain = EmailDomain::create([
            'domain'    => strtolower($validated['domain']),
            'label'     => $validated['label'] ?? null,
            'is_active' => true,
        ]);

        return response()->json(['domain' => $domain], 201);
    }

    public function update(Request $request, EmailDomain $emailDomain): JsonResponse
    {
        $validated = $request->validate([
            'label'     => ['sometimes', 'nullable', 'string', 'max:180'],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ]);

        $emailDomain->update($validated);
        return response()->json(['domain' => $emailDomain]);
    }
}
