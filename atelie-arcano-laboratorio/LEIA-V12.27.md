# Ateliê Arcano V12.27 — árvores, reflexos e vento

Esta atualização é **incremental ao laboratório existente**. Mantém água, chuva, clima, solo, neblina, modelo Quaternius e os três perfis de qualidade.

## Correções

- **Árvores e arbustos no solo:** cada instância passa a ter um pivô próprio de solo; após rotações, escalas e crescimento, a base do tronco (quando identificável) é reposicionada pela caixa real da malha. Plantas de geometria desproporcionalmente horizontal deixam de ser instanciadas como árvores.
- **Reflexos:** implementada captura planar usando câmera espelhada em relação ao nível principal de água, com projeção por matriz da câmera, recorte acima da superfície e atualização frequente. Nas outras alturas da água a projeção é aproximada. Os cubemaps anteriores são mantidos como fallback.
- **Vento:** diferenças de insolação entre solo molhado/seco, aquecimento de superfície, subida térmica do ar e alteração da pressão; ar flui dos centros de maior para menor pressão. Acrescentados desvio simplificado por Coriolis no hemisfério sul, influência do relevo/cobertura vegetal e rajadas não sincronizadas.
- **Intensidade:** controle de 0 a 100% nos ajustes. A mesma atmosfera alimenta animação das copas, balanço dos troncos e ondulação da água; diagnósticos apresentam intensidade e rumo.

## Como testar

Abra [água e floresta V12.27](https://raw.githack.com/MaroniNeves/projeto/arcano-v12-27-vento-ancoragem-reflexos/atelie-arcano-laboratorio/agua.html) por HTTPS. No painel **Mostrar ajustes**, abra **Gráficos, coleção de floresta, vento, neblina e solo** e mude o controle de intensidade. Gire a câmera e observe as árvores próximas à água. Compare **Equilibrada** e **Alta**.

## Escopo e limites

O campo atmosférico é uma aproximação visual inspirada na meteorologia, não um modelo computacional calibrado para velocidade real em m/s. A reflexão planar é fiel ao ponto de vista, mas uma mesma câmera espelhada não representa perfeitamente todos os níveis de água sobre um relevo irregular. Não há validação automatizada no GPU/navegador Android: inspeção visual no aparelho continua necessária.

Código principal: `agua-v1226.js` (nome preservado por compatibilidade) e interface `agua.html`. As versões anteriores continuam em seus ramos.
