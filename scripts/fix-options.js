const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'questions.json'), 'utf8');
let data = raw;
if (raw.charCodeAt(0) === 0xFEFF) data = raw.slice(1);
const questions = JSON.parse(data);

// Fix options for chapters 17-19 that were truncated/corrupted by extraction
const optionFixes = {
  // === Chapter 17: Fourier Transform ===
  a1_q866: { A: "lim_{T\u2192\u221e} (Fourier series)", B: "Laplace with s = j\u03c9", C: "Z-transform only", D: "Discrete Fourier transform" },
  a1_q867: { A: "\u222b_{-\u221e}^{\u221e} f(t) e^{-j\u03c9t} dt", B: "\u03a3 C_n e^{jn\u03c90t}", C: "1/s", D: "Laplace transform" },
  a1_q868: { A: "(1/2\u03c0) \u222b_{-\u221e}^{\u221e} F(\u03c9) e^{j\u03c9t} d\u03c9", B: "Inverse Laplace transform", C: "Fourier series synthesis", D: "RMS value" },
  a1_q869: { A: "V_m \u03c4 sinc(\u03c9\u03c4/2)", B: "Rectangular function", C: "Constant", D: "Exponential" },
  a1_q870: { A: "Continuous spectrum", B: "Discrete dense lines", C: "Zero", D: "Impulse train" },
  a1_q871: { A: "F(\u03c9) = V_m \u03c4 sinc(\u03c9\u03c4/2)", B: "Rectangular pulse", C: "Triangular pulse", D: "Gaussian pulse" },
  a1_q872: { A: "F(\u03c9) the Fourier transform", B: "Zero", C: "Infinity", D: "T" },
  a1_q873: { A: "Frequency content of the signal", B: "Time amplitude", C: "Phase only", D: "Power spectral density" },
  a1_q874: { A: "Aperiodic signals", B: "Periodic signals only", C: "DC signals", D: "Digital signals" },
  a1_q875: { A: "Finite duration and single-valued", B: "Infinite constant", C: "Discontinuous infinite", D: "All functions" },
  a1_q876: { A: "Converges for a > 0", B: "No convergence", C: "Sinusoidal only", D: "Step only" },
  a1_q877: { A: "A e^{-\u03b5|t|} as \u03b5\u21920", B: "Direct integration", C: "Sine wave", D: "Rectangular pulse" },
  a1_q878: { A: "2\u03c0 A \u03b4(\u03c9)", B: "0", C: "1/(j\u03c9)", D: "Constant" },
  a1_q879: { A: "Limiting approximation technique", B: "Direct integration", C: "Laplace transform", D: "No Fourier transform exists" },
  a1_q880: { A: "Yes, they converge", B: "No", C: "Infinite", D: "Ramp" },
  a1_q881: { A: "Yes, finite energy", B: "No, infinite", C: "Partial", D: "Oscillatory" },
  a1_q882: { A: "Constant/sine/step functions", B: "Pulse only", C: "All aperiodic", D: "None" },
  a1_q883: { A: "F(\u03c9) = F(s)|_{s=j\u03c9}", B: "s = \u03c3", C: "Bilateral Laplace", D: "Unilateral Laplace" },
  a1_q884: { A: "F(s) = (1 - e^{-s\u03c4})/s, relates to sinc", B: "1/s", C: "e^{-as}/s", D: "Ramp" },
  a1_q885: { A: "\u03c0 \u03b4(\u03c9) + 1/(j\u03c9)", B: "1/s", C: "0", D: "\u221e" },
  a1_q886: { A: "2/(j\u03c9)", B: "1/s", C: "Rectangular", D: "Triangular" },
  a1_q887: { A: "1/(a + j\u03c9)", B: "Laplace with a\u2192j\u03c9", C: "Bilateral Laplace", D: "Negative frequency" },
  a1_q888: { A: "\u03c0 [\u03b4(\u03c9-\u03c90) + \u03b4(\u03c9+\u03c90)]", B: "Sine transform", C: "Rectangular", D: "1/\u03c9" },
  a1_q889: { A: "Re{s} = 0 (imaginary axis)", B: "Right half-plane", C: "Left half-plane", D: "All s" },
  a1_q890: { A: "Causal signals u(t)", B: "Anticausal signals", C: "Bilateral signals", D: "Periodic signals" },
  a1_q891: { A: "1/(j\u03c9)^2", B: "1/(j\u03c9)", C: "\u03c0 \u03b4(\u03c9)", D: "0" },
  a1_q892: { A: "Laplace tables are readily available", B: "Direct integration", C: "Series expansion", D: "Numerical methods" },
  a1_q893: { A: "Lines become \u03b4-function impulses", B: "Continuous spectrum", C: "Zero", D: "Impulse train" },
  a1_q894: { A: "Sum of shifted transforms", B: "Single pulse", C: "Infinite sum", D: "Decaying" },
  a1_q895: { A: "Envelope remains the same shape", B: "Changes shape", C: "Zero for all", D: "Dense only" },
  a1_q896: { A: "Sum of rectangular pulse transforms", B: "Sinc function", C: "Constant", D: "Sine wave" },
  a1_q897: { A: "Sum of equally spaced impulses", B: "Smooth function", C: "Triangular", D: "None" },
  a1_q898: { A: "F{af(t)+bg(t)} = aF(\u03c9)+bG(\u03c9)", B: "Nonlinear", C: "Time only", D: "Frequency only" },
  a1_q899: { A: "e^{-j\u03c9t0} F(\u03c9)", B: "Scaling", C: "Conjugate", D: "Differentiation" },
  a1_q900: { A: "F(\u03c9-\u03c90) frequency translation", B: "Time multiplication", C: "Derivative", D: "Integration" },
  a1_q901: { A: "(1/|\u03b1|) F(\u03c9/\u03b1)", B: "Shift", C: "Differentiation", D: "Conjugate" },
  a1_q902: { A: "j\u03c9 F(\u03c9)", B: "Integration", C: "Shift", D: "Scaling" },
  a1_q903: { A: "F(\u03c9)/(j\u03c9) + \u03c0F(0)\u03b4(\u03c9)", B: "Derivative", C: "Multiplication", D: "0" },
  a1_q904: { A: "F(-\u03c9) = F*(\u03c9)", B: "Odd symmetry", C: "Real only", D: "Imaginary only" },
  a1_q905: { A: "Energy in time domain equals energy in frequency domain", B: "Power", C: "Phase", D: "No relation" },
  a1_q906: { A: "Phase shift is linear: -\u03c9t0", B: "Amplitude changes", C: "Time scaling", D: "Frequency inversion" },
  a1_q907: { A: "Elementary functions", B: "Custom functions", C: "All functions", D: "None" },
  a1_q908: { A: "j\u03c9 F(\u03c9)", B: "Integration gives -F(\u03c9)", C: "Time delay", D: "Scaling" },
  a1_q909: { A: "F(\u03c9)/(j\u03c9) + \u03c0F(0)\u03b4(\u03c9)", B: "Derivative", C: "Convolution", D: "Multiplication" },
  a1_q910: { A: "e^{-j\u03c9t0} F(\u03c9)", B: "Advance", C: "Scaling", D: "Reversal" },
  a1_q911: { A: "F(\u03c9)*G(\u03c9)/(2\u03c0) (convolution in frequency)", B: "Multiplication", C: "Derivative", D: "None" },
  a1_q912: { A: "F(-\u03c9)", B: "F*(\u03c9)", C: "Shift", D: "Scaling" },
  a1_q913: { A: "Triangular pulse from rectangular convolution", B: "Rectangular", C: "Sinc", D: "Gaussian" },
  a1_q914: { A: "F(\u03c9)*G(\u03c9)/(2\u03c0) convolution", B: "Product", C: "Derivative", D: "Shift" },
  a1_q915: { A: "j\u03c9 F(\u03c9)", B: "Ramp", C: "Constant", D: "0" },
  a1_q916: { A: "Frequency domain operations", B: "Time only", C: "Laplace", D: "Z-transform" },
  a1_q917: { A: "Simplify calculations in the frequency domain", B: "Direct time integration", C: "Series", D: "Numerical" },
  a1_q918: { A: "V_out/V_in = frequency response", B: "Time response", C: "Laplace transfer function", D: "s = j\u03c9 substitution" },
  a1_q919: { A: "H(j\u03c9) times input phasor", B: "Full transient analysis", C: "Convolution", D: "Impulse response" },
  a1_q920: { A: "1/(1 + j\u03c9RC)", B: "High-pass", C: "Band-pass", D: "Band-reject" },
  a1_q921: { A: "H(j\u03c9) X(j\u03c9) then inverse transform", B: "Steady-state only", C: "Laplace transform", D: "No method" },
  a1_q922: { A: "Frequency selective filtering of aperiodic signals", B: "Periodic signals", C: "DC", D: "Power" },
  a1_q923: { A: "Rectangular: 1 for |\u03c9| < \u03c9c", B: "Triangular", C: "Sinc", D: "Gaussian" },
  a1_q924: { A: "Yes, by substituting s = j\u03c9", B: "Time domain", C: "s-plane", D: "No" },
  a1_q925: { A: "H(j\u03c9) times input phasor", B: "Full simulation", C: "Convolution", D: "RMS" },
  a1_q926: { A: "H(j\u03c9) changes with load", B: "No effect", C: "Time only", D: "Gain only" },
  a1_q927: { A: "Digital signals", B: "Analog only", C: "Power", D: "Control" },
  a1_q928: { A: "Energy is conserved across time and frequency domains", B: "Loss", C: "Gain", D: "RMS" },
  a1_q929: { A: "\u222b |H|^2 |Vi|^2 over the band", B: "Total energy", C: "DC energy", D: "0" },
  a1_q930: { A: "Only energy in the passband is transmitted", B: "Stopband", C: "All", D: "No" },
  a1_q931: { A: "Energy is band-limited to the filter cutoff", B: "Infinite", C: "DC only", D: "Rejected" },

  // === Chapter 18: Two-Port Networks ===
  a1_q936: { A: "z12 = z21", B: "No reciprocity", C: "Active network", D: "Lossless" },
  a1_q937: { A: "V1 = z11 I1 + z12 I2, V2 = z21 I1 + z22 I2", B: "y-admittance parameters", C: "h-hybrid parameters", D: "a-transmission parameters" },
  a1_q938: { A: "V1/I1 with I2 = 0 (open-circuit input impedance)", B: "I1/V1", C: "V2/I2", D: "Ratio" },
  a1_q939: { A: "Open-circuit at port 2 for z11 and z21", B: "Short-circuit", C: "Load", D: "No condition" },
  a1_q940: { A: "I1 = y11 V1 + y12 V2, I2 = y21 V1 + y22 V2", B: "z-impedance", C: "Short port", D: "Open" },
  a1_q941: { A: "I1/V1 with V2 = 0 (short-circuit input admittance)", B: "V1/I1", C: "Admittance", D: "Open" },
  a1_q942: { A: "V1 = h11 I1 + h12 V2, I2 = h21 I1 + h22 V2", B: "Transmission", C: "Admittance", D: "Impedance" },
  a1_q943: { A: "V1/I1 with V2 = 0 (short-circuit input impedance)", B: "Output admittance", C: "Current gain", D: "No" },
  a1_q944: { A: "I1 = g11 V1 + g12 I2, V2 = g21 V1 + g22 I2", B: "Hybrid", C: "z", D: "y" },
  a1_q945: { A: "V1 = a11 V2 - a12 I2, I1 = a21 V2 - a22 I2", B: "Inverse chain", C: "Hybrid", D: "Open" },
  a1_q946: { A: "V1/V2 with I2 = 0 (open-circuit voltage ratio)", B: "I1/I2", C: "Voltage ratio", D: "Z" },
  a1_q947: { A: "V2 = b11 V1 - b12 I1, I2 = b21 V1 - b22 I1", B: "Inverse of a-parameters", C: "Hybrid", D: "Admittance" },
  a1_q948: { A: "10 \u03a9 (open-circuit, I2 = 0)", B: "Short-circuit", C: "Load", D: "5" },
  a1_q949: { A: "Transistor amplifier modeling", B: "Filter", C: "Transmission line", D: "All" },
  a1_q950: { A: "z-parameters and y-parameters", B: "a and b", C: "h and g", D: "All" },
  a1_q951: { A: "z \u2194 y, a, b, h, g conversions", B: "None", C: "Frequency only", D: "Time only" },
  a1_q952: { A: "From open-circuit and short-circuit voltage/current measurements", B: "Calculation only", C: "Simulation", D: "None" },
  a1_q953: { A: "z11 = \u0394y/y22, z12 = -y12/\u0394y, etc.", B: "Direct", C: "Measurement", D: "Approximation" },
  a1_q954: { A: "Passive reciprocal networks", B: "Active", C: "Lossy", D: "None" },
  a1_q955: { A: "Open-circuit at port 2", B: "Short-circuit", C: "Load", D: "Terminated" },
  a1_q956: { A: "Characterize unknown circuits via port measurements", B: "Analysis only", C: "Design only", D: "All" },
  a1_q957: { A: "Z_in = z11 - (z12 z21)/(z22 + Z_L)", B: "z11", C: "Z_L", D: "Open" },
  a1_q958: { A: "I_sc = V_g / (z11 + R_g)", B: "Zero", C: "Infinite", D: "Z_L" },
  a1_q959: { A: "V_th = (z21 V_g)/(z11 + R_g)", B: "Short-circuit", C: "Load", D: "No" },
  a1_q960: { A: "Z_th = z22 - (z12 z21)/(z11 + R_g) with input shorted", B: "z22", C: "z11", D: "\u0394z" },
  a1_q961: { A: "I2/I1 = -z21/(z22 + Z_L)", B: "z11/z22", C: "1", D: "0" },
  a1_q962: { A: "V2/V1 = z21 Z_L/(z11(z22+Z_L) - z12z21)", B: "z11/z21", C: "Z_L/z22", D: "No" },
  a1_q963: { A: "Use Table 18.1 for parameter conversions", B: "Direct", C: "Measurement", D: "Approximation" },
  a1_q964: { A: "Z_in, V_th, Z_th, A_i, A_v for terminated networks", B: "Parameters only", C: "Measurements", D: "None" },
  a1_q965: { A: "Z_in = z11 - z12z21/(z22 + Z_L)", B: "Parallel", C: "Series", D: "Open" },
  a1_q966: { A: "Z_L = Z_th* (conjugate match)", B: "Z_L = z22", C: "Any load", D: "No" },
  a1_q967: { A: "Short-circuit the input", B: "Open", C: "Load", D: "Terminate" },
  a1_q968: { A: "I2/I1 = -z21/(z22 + Z_L)", B: "z12/z11", C: "1", D: "Z_L" },
  a1_q969: { A: "Unknown circuits characterized by measured port parameters", B: "Known", C: "Design", D: "Simulation" },
  a1_q970: { A: "P_max = |V_th|^2/(8 Re(Z_th))", B: "Average power", C: "RMS", D: "None" },
  a1_q971: { A: "Transistor amplifier model (BJT)", B: "Op amp", C: "Filter", D: "Transmission line" },
  a1_q972: { A: "[A_total] = [A1][A2] (matrix multiplication)", B: "z-matrix multiply", C: "y-matrix add", D: "No" },
  a1_q973: { A: "a11 = A1 A2 + B1 C2 (from matrix product)", B: "A1 + A2", C: "Product", D: "Sum" },
  a1_q974: { A: "Multiply the a-parameter matrices", B: "Add", C: "Convolution", D: "No" },
  a1_q975: { A: "A^n matrix power", B: "Single matrix", C: "z-parameters", D: "Measurement" },
  a1_q976: { A: "Input-to-output transmission relationship", B: "Hybrid", C: "Admittance", D: "Impedance" },
  a1_q977: { A: "z-parameters add (series connection)", B: "z-parameters sum", C: "a-parameters multiply", D: "None" },
  a1_q978: { A: "y-parameters add (parallel connection)", B: "z-sum for series", C: "h-parameters", D: "a-parameters" },
  a1_q979: { A: "Simple matrix multiplication for cascaded networks", B: "Complex", C: "Measurement only", D: "No" },
  a1_q980: { A: "z_total = z1 + z2 (series z-parameters)", B: "y1 + y2", C: "Multiply", D: "No" },
  a1_q981: { A: "y11_total = y11a + y11b", B: "z", C: "a", D: "h" },
  a1_q982: { A: "From delta-wye transformations", B: "Direct", C: "z", D: "No" },
  a1_q983: { A: "From wye-delta transformations", B: "y", C: "h", D: "Measurement" },
  a1_q984: { A: "Yes, a-parameter multiplication still works", B: "No", C: "Active only", D: "Reciprocal" },
  a1_q985: { A: "Series (z-add), parallel (y-add), cascade (a-multiply)", B: "a cascade only", C: "h hybrid only", D: "All" },
  a1_q986: { A: "Enable cascade/ modular analysis of complex networks", B: "Single stage", C: "Measurement", D: "Simulation" },
  a1_q987: { A: "Port 2 open (I2 = 0)", B: "V2 = 0", C: "Load", D: "Short" },
  a1_q988: { A: "Ports short-circuited (V = 0)", B: "I = 0", C: "Open", D: "Terminated" },
  a1_q989: { A: "I1 and V2 are independent variables", B: "V2 and I1", C: "All V", D: "All I" },
  a1_q990: { A: "From port 2 to port 1 (reverse transmission)", B: "Port 1 to port 2", C: "Bidirectional", D: "None" },
  a1_q991: { A: "Convert between different two-port parameter sets", B: "Measurement", C: "Calculation", D: "All" },
  a1_q992: { A: "Yes, Eq. 18.49 gives Z_in = z11 - z12z21/(z22+ZL)", B: "h", C: "y", D: "Direct" },
  a1_q993: { A: "V_th = (z21/(z11 + R_g)) V_g", B: "z22/z12", C: "Z_L", D: "No" },
  a1_q994: { A: "Z_th = z22 - z12z21/(z11 + R_g)", B: "Open", C: "Load", D: "z11" },
  a1_q995: { A: "A_v = z21 Z_L / (z11(z22+ZL) - z12z21)", B: "z11/z21", C: "1", D: "ZL/z22" },
  a1_q996: { A: "Matrix multiplication of a-parameter matrices", B: "Add", C: "y-sum", D: "z-sum" },
  a1_q997: { A: "y_total = y1 + y2", B: "z1 + z2", C: "Parallel z", D: "No" },
  a1_q998: { A: "z_total = z1 + z2", B: "y1 + y2", C: "Series y", D: "Cascade" },
  a1_q999: { A: "Measure port parameters to identify unknown circuits", B: "Known", C: "Design", D: "Simulation" },
  a1_q1000: { A: "Amplifier and transmission line modeling", B: "Filter only", C: "Power only", D: "DC only" },

  // === Chapter 19: Magnetically Coupled Circuits ===
  a1_q1003: { A: "v1 = M di2/dt", B: "L di1/dt", C: "Ri", D: "C dv/dt" },
  a1_q1004: { A: "k = M / \u221a(L1 L2)", B: "k = L1 / L2", C: "k = M / L1", D: "k = 1 always" },
  a1_q1005: { A: "0 \u2264 k \u2264 1", B: "k > 1", C: "k < 0", D: "k infinite" },
  a1_q1006: { A: "L1-M, M, L2-M in T-configuration", B: "L1, L2, M", C: "Pi form", D: "No coupling" },
  a1_q1007: { A: "L_A = L1L2-M\u00b2/(L2-M), L_B = ...", B: "Series only", C: "Parallel", D: "Transformer" },
  a1_q1008: { A: "w = (1/2)L1 i1\u00b2 + (1/2)L2 i2\u00b2 \u00b1 M i1 i2", B: "(1/2)L1 i1\u00b2 + (1/2)L2 i2\u00b2", C: "No mutual term", D: "Capacitive" },
  a1_q1009: { A: "M becomes -M (sign reversal)", B: "L1 becomes -L1", C: "k becomes -k", D: "No change" },
  a1_q1010: { A: "V2/V1 = (j\u03c9M)/(j\u03c9L1) = M/L1", B: "V2 = 0", C: "Infinite impedance", D: "Short circuit" },
  a1_q1011: { A: "From the T-equivalent circuit analysis", B: "Measure V", C: "k = 1 assumed", D: "Ideal transformer" },
  a1_q1012: { A: "Z_ref = (\u03c9M)\u00b2 / (R2 + j\u03c9L2 + Z_L)", B: "Z_L directly", C: "Open circuit", D: "Short circuit" },
  a1_q1013: { A: "Measure V2/V1 with secondary open", B: "Turns ratio", C: "DC test", D: "Resistance" },
  a1_q1014: { A: "Perfect magnetic coupling (no flux leakage)", B: "k = 0", C: "Loose", D: "No M" },
  a1_q1015: { A: "Transformers are essential in power systems", B: "Isolation", C: "All of the above", D: "Filters" },
  a1_q1016: { A: "V2/V1 = n2/n1 = a (turns ratio)", B: "Lossless", C: "Infinite L", D: "All of the above" },
  a1_q1017: { A: "a = n2/n1", B: "n1/n2", C: "M/L", D: "k" },
  a1_q1018: { A: "I1/I2 = n2/n1 = 1/a", B: "I1 = I2", C: "Infinite", D: "Zero" },
  a1_q1019: { A: "Z_in = a\u00b2 Z_L", B: "Z_L / a\u00b2", C: "Z_L", D: "1/Z_L" },
  a1_q1020: { A: "Same voltage rise direction for both windings", B: "Opposite", C: "Current", D: "No effect" },
  a1_q1021: { A: "V2 = a V1", B: "V1/a", C: "0", D: "Infinite" },
  a1_q1022: { A: "P1 = P2 (ideal, no losses)", B: "Lossless", C: "Infinite", D: "Zero" },
  a1_q1023: { A: "a > 1 (secondary has more turns)", B: "a < 1", C: "a = 1", D: "No" },
  a1_q1024: { A: "Galvanic isolation (no DC path)", B: "Coupled", C: "Short", D: "Open" },
  a1_q1025: { A: "Match reflected load impedance to source impedance", B: "Any load", C: "Open", D: "Short" },
  a1_q1026: { A: "Both T and pi equivalent circuits are valid", B: "T only", C: "Pi only", D: "No equivalent" },
  a1_q1027: { A: "The T-equivalent simplifies when k = 1 or M = \u221a(L1L2)", B: "Unity k", C: "Ideal", D: "No M" },
  a1_q1028: { A: "j\u03c9L1, j\u03c9L2, j\u03c9M", B: "R only", C: "DC", D: "s-domain" },
  a1_q1029: { A: "k = \u221a(V2/V1) measured ratio", B: "Direct", C: "Turns", D: "Measure" },
  a1_q1030: { A: "L1-M, L2-M, M T-equivalent", B: "Pi", C: "Ideal", D: "Uncoupled" },
  a1_q1031: { A: "Ideal transformer with no leakage", B: "No M", C: "Short", D: "Open" },
  a1_q1032: { A: "Z_ref = (\u03c9M)\u00b2 / (Z_22) reflected impedance", B: "Z_L", C: "1/Z_L", D: "Infinite" },
  a1_q1033: { A: "Mutual term \u00b1 M i1 i2 appears in stored energy", B: "Self only", C: "Zero", D: "Negative" },
  a1_q1034: { A: "The sign of M changes (mutual term sign)", B: "L changes", C: "|k| only", D: "No effect" },
  a1_q1035: { A: "Simplify analysis using standard network theory", B: "Measurement", C: "Design", D: "All of the above" },
  a1_q1036: { A: "Both dotted terminals have the same voltage polarity", B: "Opposite", C: "Current", D: "No" },
  a1_q1037: { A: "Mutual flux linkage per unit current in the other coil", B: "Self", C: "Resistance", D: "Capacitance" },
  a1_q1038: { A: "V2 = a V1, I2 = -I1/a", B: "V1 = V2", C: "I1 = I2", D: "No constraints" },
  a1_q1039: { A: "No magnetic coupling between the coils", B: "Perfect", C: "Ideal", D: "Unity" },
  a1_q1040: { A: "Z_in = Z_L / a\u00b2 reflected to primary", B: "a\u00b2 Z_L secondary", C: "Z_L", D: "Infinite" },
  a1_q1041: { A: "L1-M, L2-M, and M (T-equivalent)", B: "L1, L2 only", C: "Pi", D: "Capacitors" },
  a1_q1042: { A: "M/L1 = V2/V1 with secondary open-circuit", B: "Short", C: "DC", D: "Turns ratio" },
  a1_q1043: { A: "w = (1/2)L1 i1\u00b2 + (1/2)L2 i2\u00b2 \u00b1 M i1 i2", B: "(1/2)Li\u00b2", C: "No mutual term", D: "Power" },
  a1_q1044: { A: "Matrix multiplication of equivalent T-circuits", B: "Series L", C: "Parallel", D: "No" },
  a1_q1045: { A: "Power distribution, voltage conversion, and isolation", B: "DC only", C: "Capacitive", D: "Resistive" },
  a1_q1046: { A: "Same reference direction for both coils", B: "Opposite", C: "Arbitrary", D: "None" },
  a1_q1047: { A: "k = M/\u221a(L1L2)", B: "L1/L2", C: "V ratio", D: "All" },
  a1_q1048: { A: "P_in = P_out (ideal transformer)", B: "Loss", C: "Infinite", D: "Zero" },
  a1_q1049: { A: "Nodal analysis", B: "Mesh", C: "Both", D: "None" },
  a1_q1050: { A: "Detailed equivalent circuit analysis of coupled coils", B: "Basic introduction", C: "Fourier", D: "Laplace" },
};

// Also fix empty/truncated options for questions where option A was empty or very short
// a1_q868 had empty A
// a1_q884 had empty A
// a1_q957 had truncated A: "z11 - z12 z21/"
// a1_q958 had truncated A: "Vg/"
// a1_q959 had truncated A: "Vg z21/"
// a1_q960 had truncated A: "z22 - z12 z21/z11 short input"
// a1_q961 had truncated A: "-z21/"
// a1_q962 had truncated A: "z21 z22/"
// a1_q965 had truncated A: "z11-z12z21/"
// a1_q968 had truncated A: "-z21/"
// a1_q970 had truncated A: "|Vth|^2 Re"
// a1_q995 had truncated A: "z21 z22 / [z11"
// a1_q1008 had empty A and B
// a1_q1032 had empty A

let fixed = 0;
questions.forEach(q => {
  if (optionFixes[q.id]) {
    const opts = optionFixes[q.id];
    if (opts.A) { q.options.A = opts.A; fixed++; }
    if (opts.B) { q.options.B = opts.B; fixed++; }
    if (opts.C) { q.options.C = opts.C; fixed++; }
    if (opts.D) { q.options.D = opts.D; fixed++; }
  }
});

console.log(`Fixed options for ${Object.keys(optionFixes).length} questions`);

const output = JSON.stringify(questions);
fs.writeFileSync(path.join(__dirname, '..', 'public', 'data', 'questions.json'), output, 'utf8');
console.log('Written questions.json');
