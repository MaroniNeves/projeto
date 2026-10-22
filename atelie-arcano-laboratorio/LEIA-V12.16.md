# Água V12.16 — pedras parcialmente e totalmente submersas

Atualização realizada diretamente no **Ateliê Arcano** do repositório `MaroniNeves/projeto`, partindo da Água V12.15. As versões antigas e a biblioteca de 100 magias continuam preservadas.

## Bug corrigido

A antiga simulação classificava células sob as pedras como `blocked`, não aplicava chuva nelas, impedia a passagem da água para esses pontos e zerava a profundidade de toda célula de rocha a cada atualização. Por isso surgiam regiões artificialmente secas onde deveriam existir poças ou lagoas envolvendo as pedras.

Na V12.16:
- A água pode acumular profundidade e transbordar nos pontos ocupados pelas pedras.
- Pedras ainda oferecem **resistência ao escoamento raso** (fator de 0,54 até 1, variando com o nível); não são mais barreiras impermeáveis na grade hidrológica.
- O sólido 3D das rochas continua sendo desenhado com teste de profundidade: onde a rocha ultrapassa a lâmina d'água, ela permanece visível; onde a água sobe acima dela, a superfície a encobre. A transparência da água ainda permite visualização parcial da pedra submersa.
- As gotículas de chuva consideram uma altura aproximada do relevo da rocha quando ela está exposta; quando a água cobre esse relevo, a colisão passa a ocorrer com a água. Ondas de impacto não se desenham sobre pedras emergidas.
- A altura da rocha usada para colisão é uma **aproximação elipsoidal**, baseada nos modelos 3D existentes, e não uma simulação de malha física de deslocamento de água.
- O painel Lagoa apresenta contagem de rochas **molhadas** e **encobertas** pelo nível da água.

## Mantido

A nova superfície 3D de alta densidade, ondas, reflexos do cenário, cores turquesa por profundidade, pedras estilizadas, margens molhadas, chuva, infiltração, secagem, turbidez, solo argiloso/compactado/solto e time-lapse foram preservados. O sistema de água continua sendo um modelo demonstrativo, não calibrado.

## Verificações

Teste numérico da física, em 68 × 56 células e chuva durante 40 segundos simulados, seguida de interrupção:

| Cenário | Células de pedra com água aos 40 s | Volume de superfície aos 40 s | Volume aos 120 s |
|---|---:|---:|---:|
| Lagoa (chuva moderada) | 13 de 112 | 3,46 | 0,85 |
| Temporal intenso | 111 de 112 | 77,62 | 31,01 |
| Poças (chuva moderada) | 2 de 112 | 0,47 | 0,05 |

O teste de conservação de volume teve erro inferior a 0,007 nas leituras de todos os cenários, sem volumes negativos. O valor de células com água **não equivale a 13 pedras inteiras submersas**: são células cobertas por algum volume de água dentro das projeções das rochas.

Teste de colisão aproximada em rocha artificial de altura 0,42: com lâmina 0 a gota atinge a rocha em 0,42; com lâmina 0,15 continua atingindo a parte emersa em 0,42; com lâmina 0,51 passa a atingir a água em 0,51.

**Limitação:** estes são testes lógicos e numéricos. A aparência final ainda deve ser inspecionada em navegador com WebGL, particularmente no Android. As rochas não aplicam deslocamento de volume exato na água, apenas resistência de escoamento e oclusão visual.

## Arquivos

- `atelie-arcano-laboratorio/index.html`: menu do laboratório com Água V12.16
- `atelie-arcano-laboratorio/agua.html`: painel e acesso ao script novo
- `atelie-arcano-laboratorio/agua-v1216.js`: física revisada e rochas submersíveis
- `atelie-arcano-laboratorio/agua-v1215.js`: versão anterior mantida
