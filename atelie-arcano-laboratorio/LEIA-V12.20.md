# Ateliê Arcano — Água V12.20 · Temporal forte e nuvens em frentes

Publicado no mesmo laboratório do repositório `MaroniNeves/projeto`, a partir da V12.19. A V12.19 foi preservada junto ao motor de água 3D, ao dia de **24 minutos reais** e às 100 magias.

## Por que o temporal parecia fraco

No motor anterior, a quantidade de gotas visíveis era limitada a 230 no celular / 420 no desktop, e a taxa de chuva do modo físico era parecida com a de precipitação moderada em muitas regiões. Além disso, o céu construía nuvens a partir de várias formas quase circulares.

## Chuva da V12.20

- O modo **Temporal intenso** e o nível máximo de intensidade entram num estado de tempestade com umidade inicial alta, nuvens pesadas e pressão atmosférica reduzida.
- A frente mantém o abastecimento simplificado de umidade e produz precipitação regional mais forte; a remoção de umidade por chuva também continua. O controle **Parar chuva** zera a precipitação, mesmo que ainda haja nuvens carregadas.
- A chuva física passa pelas mesmas etapas de interceptação por plantas, infiltração, percolação, escoamento para depressões, evaporação e represamento que já existiam.
- No temporal, rajadas alteram velocidade e inclinação das gotas. A chuva tem gotículas mais rápidas, filetes alongados, mais impactos e menos aparência de pontinhos brilhantes.
- O número máximo de gotas 3D simultâneas aumentou para **490 no celular** e **950 no desktop**, usando a instância de geometria já existente; limites de criação por quadro evitam picos desnecessários.
- O clima de tempestade tem céu mais escuro, sol fraco e neblina um pouco mais próxima.
- A física foi calibrada separadamente da aparência: muitas gotas visíveis não depositam água duplicada, e a precipitação atmosférica controla o volume efetivo.

## Nuvens menos redondas

Foi retirada a composição por células circulares de cúmulos da V12.19. O céu utiliza agora:

- **Formações estratocumuliformes** de contorno deformado por ruído coerente e erosão de borda;
- **Bandas de frente fria** largas e conectadas, com alongamento/cisalhamento pelo vento;
- **Camadas distantes finas**, base escurecida de tempestade e iluminação diferente nos topos;
- Borda suave, detalhes irregulares de múltiplas escalas e movimentos atmosféricos;
- Lua/estrelas, ciclo solar e reflexos das nuvens na água preservados.

**Limitação visual:** a nuvem ainda é representada por um shader na cúpula do céu, com aparência volumétrica aproximada, não por uma simulação 3D volumétrica ray-marched.

## Testes

Validação de sintaxe JavaScript e inspeção estrutural do shader da V12.20. Teste numérico integrado, com grade de água 68 × 56, atmosfera regional, física acelerada em 4× e chuva interrompida após 60 segundos reais:

| Instante real | Chuva média no temporal (un. internas/s) | Volume de água superficial (un. do simulador) | Observação |
|---|---:|---:|---|
| 10 s | ~0,00667 | ~28,39 | Chuva forte presente |
| 20 s | ~0,00668 | ~71,28 | Água se acumula nas áreas baixas |
| 40 s | ~0,00668 | ~141,40 | Temporal prolongado |
| 60 s | ~0,00669 | ~196,41 | Antes de parar chuva |
| 85 s | 0 | ~111,46 | Chuva parada, água diminui |

O balanço de massa do subsistema hidrológico teve erro inferior a 0,005 nos momentos amostrados, sem água negativa. Como o time-lapse está em **4×**, em tempestades prolongadas a água ainda pode inundar regiões extensas; isso é intencional no cenário de temporal, não na chuva normal. A chuva moderada permaneceu muito mais fraca e, no teste, quase toda foi absorvida.

Os formatos de nuvem foram avaliados pela estrutura e por amostragem da máscara de cobertura, **não** renderizados em navegador WebGL real nesta sessão. A aparência no Android ainda precisa ser conferida.

## Arquivos

- `atelie-arcano-laboratorio/index.html`: botão Temporal + Água V12.20
- `atelie-arcano-laboratorio/agua.html`: interface Água V12.20
- `atelie-arcano-laboratorio/agua-v1220.js`: motor completo com novas nuvens e temporal reforçado
- `atelie-arcano-laboratorio/agua-v1219.js`: versão anterior preservada
