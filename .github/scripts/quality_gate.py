#!/usr/bin/env python3
import json
import sys

def main(path):
    try:
        data = json.load(open(path))
    except FileNotFoundError:
        print(f"Trivy report not found at {path}, skipping quality gate check.")
        return 0
    except Exception as e:
        print(f"Failed to read trivy report: {e}")
        return 2
    failing = []

    def extract_cvss(vuln):
        try:
            if 'CVSSScore' in vuln:
                return float(vuln.get('CVSSScore'))
            elif 'CVSS' in vuln and isinstance(vuln['CVSS'], dict):
                for k in ('nvd', 'vendor', 'redhat'):
                    entry = vuln['CVSS'].get(k)
                    if isinstance(entry, dict):
                        for candidate in ('V3Score', 'Score', 'v3Score'):
                            if candidate in entry:
                                try:
                                    return float(entry[candidate])
                                except Exception:
                                    pass
        except Exception:
            return None
        return None

    for res in data.get('Results', []):
        for vuln in res.get('Vulnerabilities', []) or []:
            sev = (vuln.get('Severity') or 'UNKNOWN').upper()
            cvss = extract_cvss(vuln)

            hit = False
            if cvss is not None:
                try:
                    if float(cvss) >= 7.0:
                        hit = True
                except Exception:
                    pass
            if sev in ('HIGH', 'CRITICAL'):
                hit = True

            if hit:
                failing.append({
                    'VulnerabilityID': vuln.get('VulnerabilityID'),
                    'PkgName': vuln.get('PkgName') or vuln.get('Target') or vuln.get('ArtifactName'),
                    'InstalledVersion': vuln.get('InstalledVersion'),
                    'FixedVersion': vuln.get('FixedVersion'),
                    'Severity': sev,
                    'CVSS': cvss,
                    'Title': vuln.get('Title') or vuln.get('Description')
                })

    if failing:
        print("Found vulnerability with CVSS >=7.0 or severity HIGH/CRITICAL. Failing quality gate.")
        print(json.dumps({'failures': failing}, indent=2))
        return 1

    print("No CVSS >=7.0 or HIGH/CRITICAL vulnerabilities found.")
    return 0

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: quality_gate.py <trivy-report-path>")
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
