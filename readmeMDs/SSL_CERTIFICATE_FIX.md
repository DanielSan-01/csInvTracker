# SSL Certificate Issue Fix Guide

## Problem
Firefox shows "Peer's Certificate issuer is not recognized" with a Fortinet certificate when accessing `www.csinvtracker.com`.

## Root Cause
- **DNS is correctly configured** (points to Vercel)
- **Network-level SSL interception**: A Fortinet firewall/proxy is intercepting HTTPS connections
- **HSTS is cached**: Firefox has HSTS stored for this domain, preventing exceptions

## Why Other Sites Work
Other CS sites likely don't have HSTS cached in your browser, so Firefox allows certificate exceptions. Your site has HSTS cached from a previous visit.

## Solutions

### Solution 1: Clear HSTS Cache (Quick Fix)

**Firefox:**
1. Type `about:preferences#privacy` in address bar
2. Scroll to "Cookies and Site Data"
3. Click "Clear Data"
4. Check "Cookies and Site Data"
5. Click "Clear Now"
6. Or specifically: `about:preferences#privacy` → "Manage Data" → Search for `csinvtracker.com` → Remove

**Alternative - Clear HSTS via about:config:**
1. Type `about:config` in address bar
2. Search for `security.tls.insecure_fallback_hosts`
3. Add `csinvtracker.com` (temporary workaround)

### Solution 2: Access from Different Network
- Use mobile hotspot
- Use home network (if different from current)
- Use VPN that doesn't do SSL inspection

### Solution 3: Install Fortinet Root CA (If on Corporate Network)
1. Contact IT/admin for Fortinet root CA certificate
2. **Firefox**: Settings → Privacy & Security → Certificates → View Certificates → Authorities → Import
3. **macOS**: Add to Keychain Access → System keychain → Trust → Always Trust

### Solution 4: Configure Firewall Bypass (If You Have Admin Access)
Add `www.csinvtracker.com` to SSL inspection bypass list in Fortinet firewall.

## Verification

DNS is correctly configured:
- `www.csinvtracker.com` → `9e798013a60463b4.vercel-dns-017.com` (Vercel)
- `csinvtracker.com` → `216.198.79.1` (Vercel IP)

The issue is network-level SSL interception, not a DNS or Vercel configuration problem.

## Note
This is a **local network issue**, not a problem with your site. Other users should be able to access the site normally. The Fortinet certificate is being injected by your network's firewall/proxy.

