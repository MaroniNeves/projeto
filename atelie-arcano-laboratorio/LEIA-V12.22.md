# Ateliê Arcano V12.22 — Solo vivo e nutrição vegetal

Atualização aplicada **diretamente ao mesmo laboratório** (`MaroniNeves/projeto`) sobre a versão V12.21. Preserva o ciclo solar de 24 minutos, a chuva regional, infiltração, água 3D, pedras, reflexos e as 100 magias.

## Análise do vídeo de referência

O arquivo enviado `giroka_dev_20261022_130625624.mp4` tem **156,63 segundos**. Nas legendas e demonstrações, o criador apresenta:

- Solo com propriedades físicas diferentes conforme tipo de material; areia quartzosa drena rápido, argila pode reter água/rachar, várzea recebe matéria orgânica, canga prende fósforo e locais salinos têm problemas de salinidade.
- Representação por células, com camadas de terra, umidade, nutrientes e decomposição; ciclagem de serapilheira e contribuição da fauna.
- Fator limitante para plantas: falta de água, N, fósforo ou outro recurso controla crescimento mesmo quando os demais são abundantes.
- Compactação/pisoteio formando trilhas, e relação entre vegetação, matéria orgânica e uso da terra.

### Limitações admitidas no final do vídeo e soluções

1. **Índices relativos em vez de kg/ha:** manter índice normalizado para prototipar, mas adicionar mapeamento de unidades por volume de solo, profundidade efetiva de raízes, densidade aparente, concentração em mg/kg e conversão para kg/ha, calibrado por espécie/solo. Não converter índices arbitrários diretamente sem medidas.
2. **Várzea perde matéria orgânica rápido demais:** reduzir a mineralização em condição saturada/anaeróbia, considerar frações de carbono lábil/estável, material orgânico recebido por cheias e deposição de sedimentos, evitando taxa única para todos os solos. A V12.22 **já reduz** a decomposição em solo alagado e agrega pequena deposição orgânica em várzea.
3. **Faltam minhocas e cupins:** introduzir populações locais de decompositores com umidade, temperatura, pH e habitat; incorporar bioturbação, túneis/poros e fezes como entrada de húmus, sem criar fauna desenhada em cada vértice. A V12.22 adiciona só um **índice funcional de atividade biológica**, ainda não animais explícitos.
4. **Falta fogo:** implementar ignição por secura, combustível fino (serapilheira), vento, temperatura e fontes de calor; propagação na vizinhança, consumo de biomassa, cinzas/nutrientes devolvidos parcialmente, perda de carbono, recuperação e regras de controle. **Não incluído** nesta etapa para preservar o foco de solo/plantas; requer cuidado de gameplay e validação visual.

Esses quatro problemas foram identificados **nas legendas visíveis do vídeo**, não de uma transcrição literal conferida por reconhecimento de voz.

## Perfis de solo implementados

Além dos solicitados, há 11 perfis selecionáveis no painel, mais o modo **Mosaico ecológico**:

| Perfil | Traço físico/químico principal |
|---|---|
| Franco | referência equilibrada de textura média |
| Arenoso | baixa retenção e drenagem alta; baixa reserva de N |
| Argiloso | retenção maior, infiltração menor; P menos disponível |
| Siltoso | retenção intermediária, sensível a erosão |
| Humoso / orgânico | mais matéria orgânica e água retida |
| Calcário | pH mais alto e cálcio abundante; nutrientes podem limitar |
| Aluvial / várzea | reserva orgânica e umidade altas, drenagem menor |
| Laterítico / canga | mais ácido e com fósforo pouco disponível |
| Pedregoso | pequeno volume de água útil e drenagem rápida |
| Salino | sais limitam o desenvolvimento das plantas |
| Compactado | baixa infiltração e menor volume de água acessível |

**Nota científica importante:** arenoso, argiloso e siltoso são classes granulométricas; humoso, calcário, salino, aluvial ou compactado são características de natureza diferente (matéria orgânica, química, ambiente de deposição ou condição estrutural). Estes perfis são **arquétipos de gameplay**, não as classes taxonômicas oficiais do SiBCS.

## Implementado na V12.22

- Malha hidrológica existente mantém os arrays de água; cada célula também possui perfil, matéria orgânica, serapilheira, N, P, K, Ca, pH, salinidade, biota, biomassa, condição de crescimento e fator limitante.
- Os perfis alteram diretamente `soilCapacity`, `permeability`, erosão, turbidez, cor do terreno e saúde das plantas.
- As mudas 3D low-poly têm caule e duas folhas, feitas no código com materiais próprios; o capim instanciado muda **escala e tonalidade** conforme nutrientes e umidade na sua posição.
- O crescimento usa o mínimo entre os fatores água, N, P, K, Ca, pH, salinidade e oxigênio. A planta extrai nutrientes e água das reservas locais. O modelo é simplificado: plantas genéricas, sem espécies botânicas específicas nesta etapa.
- Matéria orgânica gera minerais por mineralização lenta; nitrogênio/potássio são perdidos por lixiviação conforme drenagem; fósforo sofre adsorção relativa nos solos mais fixadores.
- Condição alagada reduz muito a decomposição da matéria orgânica; várzeas inundadas recebem aporte simplificado de resíduos em suspensão.
- O painel traz dois experimentos: **Adicionar folhas** e **Adubar N/P/K**, com indicadores de N/P/K/Ca, húmus, pH, sais, biota e principal fator limitante.
- A vida das plantas acompanha o relógio real do jogo: **1 dia = 1.440 segundos reais**. O time-lapse da água não transforma segundos reais em dias de crescimento vegetal.

## Verificações feitas

- Sintaxe JavaScript validada; integração dos IDs do HTML com o arquivo versionado conferida.
- Teste dos **11 perfis** com a mesma água inicial confirmou diferenças de capacidade, infiltração, pH, nutrientes e fator limitante.
- Exemplo de coeficientes no teste: arenoso `cap=0,0638, infiltração=0,01485`; argiloso `cap=0,1474, infiltração=0,00247` (valores normalizados do teste, não m/h).
- Laterítico apresentou **fósforo** como principal fator limitante; salino, **salinidade**; arenoso, **nitrogênio**.
- Teste de 1 dia do jogo com matéria orgânica na várzea: queda relativa da serapilheira **~0,169** em solo arejado versus **~0,002** em solo encharcado; a deposição orgânica por inundação acrescentada depois reforça ainda mais a conservação relativa.
- Teste hidrológico com solos arenoso, argiloso, aluvial, siltoso, laterítico e mosaico manteve balanço da água com erro absoluto inferior a 0,0001 e sem profundidades negativas no cenário verificado.
- **O shader/ambiente visual completo não foi compilado/inspecionado em navegador Android neste turno.**

## Fontes científicas consultadas

- Embrapa, textura do solo: https://www.webambiente.cnptia.embrapa.br/webambiente/wiki/doku.php?id=webambiente:textura
- Embrapa, classes do SiBCS: https://www.embrapa.br/solos/sibcs
- Embrapa, atributos do solo: https://www.embrapa.br/en/web/solos/sibcs/atributos-do-solo
- USDA NRCS, matéria orgânica e efeito de baixa oxigenação na decomposição: https://www.nrcs.usda.gov/sites/default/files/2022-10/Soil%20Organic%20Matter.pdf
- Embrapa, nutrientes, pH e correção do solo: https://www.embrapa.br/web/agencia-de-informacao-tecnologica/cultivos/milho/producao/manejo-do-solo-e-adubacao/adubacao-e-fertilidade-do-solo/planejamento-da-adubacao-e-calagem

## Arquivos

- `atelie-arcano-laboratorio/index.html`: laboratório completo — Solo Vivo V12.22
- `atelie-arcano-laboratorio/agua.html`: painel de perfis e nutrição vegetal
- `atelie-arcano-laboratorio/agua-v1222.js`: engine completo
- `atelie-arcano-laboratorio/agua-v1221.js`: versão anterior preservada
