<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Make every test request look like it originates from the SPA frontend.
     *
     * The app authenticates via Sanctum's stateful SPA flow: Sanctum only
     * starts a session (cookies + CSRF) when it recognises the request as
     * coming from a configured stateful domain, matched on the Origin/Referer
     * header. Endpoints such as POST /api/login and /api/logout then call
     * $request->session()->regenerate()/invalidate(), which require that
     * session to exist. Sending an Origin that matches SANCTUM_STATEFUL_DOMAINS
     * (pinned to "localhost" in phpunit.xml) reproduces real browser behaviour
     * so those endpoints can be exercised under test.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Origin', 'http://localhost');
    }
}
