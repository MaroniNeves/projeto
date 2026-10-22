# Ateliê Arcano — Água V12.21 · Escala progressiva da chuva

Atualização aplicada **diretamente ao mesmo laboratório** `MaroniNeves/projeto`, partindo da V12.20. Não foram removidos modelos, efeitos, a água 3D, a atmosfera regional nem as 100 magias.

## Problema corrigido

Na V12.20, as intensidades 1–4 eram limitadas pelo mesmo campo atmosférico fraco. Assim, muitas vezes a garoa, a chuva fraca e a moderada pareciam quase iguais, e o nível 5 acionava um temporal muito maior. A chuva visual também tinha multiplicadores próprios que não correspondiam bem à água realmente depositada no solo.

## Escala unificada

A V12.21 cria `RAIN_SCALE`, a tabela única utilizada por chuva física e efeitos visuais:

| Nível | Categoria | Precipitação máxima ilustrativa / segundo simulado | Gotas-alvo/s celular | Gotas-alvo/s desktop |
|---:|---|---:|---:|---:|
| 0 | Sem chuva | 0 | 0 | 0 |
| 1 | Garoa | 0,00013 | 27 | 42 |
| 2 | Chuva fraca | 0,00042 | 64 | 100 |
| 3 | Chuva moderada | 0,00140 | 130 | 210 |
| 4 | Chuva forte | 0,00330 | 235 | 380 |
| 5 | Temporal intenso | 0,00610 | 440 | 690 |

**Observações:** as unidades de precipitação são **internas do jogo**, não mm/h físicos. Gotas-alvo representam a taxa visual sob disponibilidade atmosférica integral: a taxa real exibida é reduzida nas regiões sem nuvens chuvosas, e a quantidade simultânea é limitada pela duração de cada gota e pelo dispositivo.

Quando a atmosfera física está ligada, a precipitação em cada célula é:
`taxaNível × pow(clamp(taxaRegional / 0.00050, 0, 1), 0.72)`.
O nível determina quanto pode chover; umidade, nuvens e vento ainda determinam onde chove. Com atmosfera desligada, aplica-se a taxa manual da tabela, uniformemente.

A barreira de **nível 5** só é ativada quando a intensidade está realmente em 5 — mudar de Temporal para 3 não mantém a força máxima escondida.

## Visual das gotas

O mesmo perfil define quantidade, velocidade, comprimento e espessura. Garoa usa gotas delicadas, lentas e pequenas; chuva moderada fica bem mais perceptível; chuva forte aumenta volume e impactos; temporal mantém gotas densas, compridas, rápidas e inclinadas pelo vento. A amostragem espacial tenta gerar as gotas sobretudo onde há chuva regional, evitando a sensação de chuva uniforme em céu sem precipitação.

A barra da chuva também ganhou escala visual não linear compatível com o volume, aproximadamente 0%, 9%, 19%, 40%, 68% e 100%.

## Verificações

Um teste isolado com a mesma disponibilidade atmosférica em todos os níveis (`taxaRegional=0,00024` em todas as células, solo inicial seco, malha 68 × 56, 24 s simulados) apresentou:

| Nível | Água recebida pela cena (volume interno) | Infiltração acumulada | Água superficial ao fim |
|---:|---:|---:|---:|
| 0 | 0 | 0 | 0 |
| 1 | 0,608 | 0,488 | 0 |
| 2 | 1,965 | 1,577 | 0 |
| 3 | 6,550 | 5,257 | 0 |
| 4 | 15,439 | 12,356 | 0,018 |
| 5 | 28,539 | 21,981 | 0,536 |

Em todos os níveis, o balanço hídrico ficou com erro máximo de aproximadamente `0,00001`, sem profundidades negativas. Esse teste usa **o mesmo clima sintético** para comparar a escala; no jogo, selecionar o nível 5 também provoca nuvens e vento mais fortes, que podem aumentar a chuva regional.

Nenhum teste de renderização real foi realizado no Android. Código e integração HTML/GitHub foram verificados.

## Recursos preservados

Ciclo de 24 minutos por dia, sol e lua, vento, umidade, pressão, nuvens em frentes, reflexos dos objetos, formação e secagem das poças, pedras parcialmente submersas, tipos de solo, transpiração e a biblioteca de 100 magias.

## Arquivos

- `atelie-arcano-laboratorio/index.html` — acesso à Água V12.21
- `atelie-arcano-laboratorio/agua.html` — interface V12.21 e descrição da escala
- `atelie-arcano-laboratorio/agua-v1221.js` — motor completo com tabela progressiva
- `atelie-arcano-laboratorio/agua-v1220.js` — versão anterior preservada
