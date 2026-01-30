# STRIDE-K8S-PRIVESC-001: Kubernetes Privilege Escalation via RBAC Misconfiguration

## Overview
This pattern addresses Critical (CVSS 9.1) privilege escalation vulnerabilities in Kubernetes clusters caused by overly permissive RBAC configurations.

## Key Statistics
- **Confidence Score**: 8.8/10
- **Severity**: Critical
- **CVSS Score**: 9.1
- **STRIDE Category**: Elevation of Privilege
- **Real CVEs Referenced**: 3
- **Real-World Incidents**: 3
- **Mitigation Controls**: 3
- **Code Examples**: 544 lines of YAML/Go

## Referenced CVEs
1. **CVE-2018-1002105** (CVSS 9.8) - Kubernetes API server privilege escalation
2. **CVE-2019-11247** (CVSS 8.1) - Namespace-scoped access to cluster-scoped resources
3. **CVE-2019-11253** (CVSS 7.5) - API server DoS (often combined with privilege escalation)

## Real-World Incidents
1. **Tesla Kubernetes Cryptomining Breach (2018)** - Exposed K8s dashboard led to pod deployment and AWS credential theft
2. **Shopify Bug Bounty (2020)** - $25,000 payout for demonstrating privilege escalation via RBAC misconfiguration
3. **Microsoft Azurescape (2021)** - Cross-tenant container escape in Azure Container Instances

## Comprehensive Mitigations

### MIT-001: Least Privilege RBAC (101 lines)
- Namespace-scoped Roles instead of ClusterRoles
- Explicit permission lists (no wildcards)
- Service account token mounting disabled by default
- Complete YAML examples for secure RBAC configuration

### MIT-002: Pod Security Standards (162 lines)
- Pod Security Admission controller configuration
- OPA Gatekeeper constraint templates
- Kyverno policies for volume mount restrictions
- Enforcement of runAsNonRoot and capability dropping

### MIT-003: Admission Webhooks + Falco (281 lines)
- Custom validating webhook implementation in Go
- RBAC binding validation logic
- Falco runtime detection rules for privilege escalation
- Integration with SIEM platforms

## Detection & Monitoring

### SIEM Queries (5 platforms)
1. **Azure Sentinel (KQL)** - Privileged pod creation detection
2. **Azure Sentinel (KQL)** - Unauthorized RBAC modifications
3. **Elastic Stack (EQL)** - Pod/exec sequence analysis
4. **Splunk (SPL)** - Multi-condition privilege escalation detection
5. **Falco** - Runtime kernel-level monitoring

### Security Tools
- kubectl-who-can - RBAC permission auditing
- rbac-lookup - RBAC visualization
- Krane - RBAC security analysis
- Kube-bench - CIS Kubernetes benchmark
- KubiScan - Risk assessment
- Kubestriker - Security auditing
- Kubescape - Comprehensive security testing

## Attack Scenario (6 Steps)
1. Compromise low-privilege pod via application vulnerability
2. Discover overly permissive service account RBAC
3. Create privileged pod with hostPath volume mounts
4. Escape to node filesystem via container breakout
5. Extract cluster-admin credentials from node
6. Achieve full cluster compromise

## Compliance Mappings
- **MITRE ATT&CK**: T1068, T1078.004, T1610
- **OWASP Top 10**: A01:2021, A05:2021
- **CWE**: CWE-269, CWE-250, CWE-284
- **Standards**: PCI-DSS, HIPAA, SOC2, ISO27001, NIST 800-190, CIS Kubernetes Benchmark

## Files
- `STRIDE-K8S-PRIVESC-001.json` - Complete pattern specification (356 lines)

## Usage
This pattern can be used for:
- Kubernetes security assessments
- RBAC policy reviews
- Incident response playbooks
- Security training and awareness
- Compliance auditing
- Threat modeling exercises

## Validation
```bash
# Validate JSON structure
python3 -m json.tool STRIDE-K8S-PRIVESC-001.json > /dev/null

# Extract key metrics
jq -r '.metadata.confidence_score, .threat.cvss_v3.score, (.mitigations | length)' STRIDE-K8S-PRIVESC-001.json
```

## Next Steps
1. Import into STRIDE threat model
2. Configure SIEM queries for your environment
3. Deploy OPA Gatekeeper or Kyverno policies
4. Implement RBAC audit scheduled tasks
5. Enable Kubernetes audit logging
6. Deploy Falco for runtime monitoring
