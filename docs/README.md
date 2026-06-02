# Documentação — INCIDENT_SYS

Índice oficial da documentação do projeto. Cada pasta cobre **um público e um objetivo**; evite duplicar conteúdo entre elas.

| Pasta | Público | Conteúdo |
|-------|---------|----------|
| [manual-usuario/](manual-usuario/) | Usuários finais, analistas, admins da UI | Como usar o sistema (telas, fluxos, erros) |
| [guia-wazuh/](guia-wazuh/) | Infra / SOC | Instalação do Wazuh SIEM e integração com o ISS |
| [arquitetura-deploy/](arquitetura-deploy/) | Desenvolvedores, DevOps | MVC, banco, deploy, diagramas, troubleshooting técnico |
| [relatorio-tecnico/](relatorio-tecnico/) | Acadêmico / auditoria | Relatório completo do projeto (escopo, testes, decisões) |
| [apresentacao/](apresentacao/) | Apresentações | Slides HTML, PPTX e roteiro |
| [interno/](interno/) | Equipe de desenvolvimento | TODO do projeto |

## Início rápido

- **Usar o sistema** → [manual-usuario/MANUAL_USUARIO.md](manual-usuario/MANUAL_USUARIO.md)
- **Subir o projeto localmente** → [README.md](../README.md) na raiz + [arquitetura-deploy/DEPLOYMENT.md](arquitetura-deploy/DEPLOYMENT.md)
- **Integrar Wazuh** → [guia-wazuh/GUIA_INSTALACAO_WAZUH.md](guia-wazuh/GUIA_INSTALACAO_WAZUH.md)
- **Entender a estrutura do código** → [arquitetura-deploy/ARQUITETURA.md](arquitetura-deploy/ARQUITETURA.md)

## O que foi unificado

| Antes (redundante) | Agora |
|--------------------|--------|
| `manual_implantacao.md` (MySQL, paths antigos) | Removido — use [DEPLOYMENT](arquitetura-deploy/DEPLOYMENT.md) + [ARQUITETURA](arquitetura-deploy/ARQUITETURA.md) |
| Vários `.md` soltos na raiz de `docs/` | Pastas por tema + este índice |
| `ARQUITETURA_MVC.md` + `DEPLOYMENT.md` + `DATABASE_POSTGRES.md` | Pasta [arquitetura-deploy/](arquitetura-deploy/) |

## Gerar DOCX do guia Wazuh

```powershell
python backend/scripts/build_wazuh_docx.py
```

Saída: `docs/guia-wazuh/GUIA_INSTALACAO_WAZUH.docx`
