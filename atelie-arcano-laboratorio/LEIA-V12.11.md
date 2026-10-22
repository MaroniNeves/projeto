# Água V12.11 — solo absorvente, poças localizadas e secagem

A atualização modifica a aba Água do **Ateliê Arcano** e preserva as versões anteriores, o catálogo de magias e as demais abas.

## Comportamento

- **Chuva não cobre tudo:** boa parte cai na terra e infiltra, escurecendo a superfície; somente as depressões que acumulam água exibem poças e lagoas. A simulação continua permitindo inundações sob chuva excepcionalmente intensa e prolongada.
- **Água desenhada somente nas áreas realmente molhadas:** cada face da malha precisa ter pelo menos dois vértices com lâmina de água de 0,006 unidade. Assim, a água rasa isolada não pinta grandes triângulos de solo seco.
- **Após cessar a chuva:** a infiltração da água superficial continua, mesmo quando a chuva está no nível 0, porque a camada do solo segue drenando para camadas profundas; a evaporação e o escoamento também continuam. O solo pode permanecer escuro e úmido por algum tempo depois do desaparecimento das poças.
- **Controle direto:** botão **☀ Parar chuva** troca o nível para 0; o mesmo botão vira **🌧 Retomar chuva** e recupera o último nível.
- **Métricas separadas:** porcentagem de área com poças versus área de terra úmida sem poças, volume da água de superfície, infiltração acumulada e reservatório subterrâneo.

## Taxas ilustrativas

- Chuva moderada de demonstração ajustada de 0,0043 para 0,0035 unidade/s.
- Percolação da camada superficial para o reservatório profundo ampliada de 0,00044 para 0,0030 unidade/s, modulada pela saturação.
- Evaporação da água superficial ampliada de 0,00013 para 0,00040 unidade/s.
- Os modos **Infiltração**, **Escoamento**, **Retenção/evaporação**, **Combinado**, o terreno variável, as pedras, os efeitos de impacto, a turbidez e o time-lapse foram mantidos.

## Testes de lógica (não teste visual Android)

Teste com 68 × 56 células, modo Poças, terra comum, chuva moderada durante 40 segundos simulados e depois desligada:

| Tempo simulado | Cobertura com poças | Volume superficial |
|---|---:|---:|
| 0 segundos | 0% | 0 |
| 20 segundos (chovendo) | 8,4% | 1,02 |
| 40 segundos (chovendo) | 28,0% | 6,24 |
| 60 segundos (20 s sem chuva) | 10,6% | 3,57 |
| 120 segundos (80 s sem chuva) | 3,8% | 1,53 |
| 200 segundos (160 s sem chuva) | 1,5% | 0,55 |

O contador de infiltração aumentou de 26,15 para 30,12 unidades cúbicas entre 40 e 200 segundos simulados, e a evaporação acumulada passou de 7,00 para 17,04. O balanço numérico de água ficou próximo de zero (erro máximo de cerca de 0,001 unidade de volume nos cenários testados).

Um teste de geometria verificou **zero triângulos visíveis no solo seco**, também zero para uma única célula molhada isolada, e triângulos válidos quando duas células vizinhas acumulam água.

**Atenção:** taxas e unidades são ilustrativas para visualização; o simulador não é calibrado para um solo, clima ou aquífero real. É necessário WebGL e conexão com o CDN do Three.js. O resultado visual final não foi testado em um Android físico.

## Arquivos

- `atelie-arcano-laboratorio/index.html`: laboratório completo, agora com a aba Água V12.11
- `atelie-arcano-laboratorio/agua.html`: interface, botão de interrupção da chuva e métricas
- `atelie-arcano-laboratorio/agua-v1211.js`: física e renderização revisadas
- `atelie-arcano-laboratorio/agua-v1210.js`: versão anterior preservada
