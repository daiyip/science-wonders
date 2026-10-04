// Influenza in an English boarding school, January to February 1978.
// in_bed: boys confined to bed on each day from 22 January 1978 (day 0) to 4 February (day 13);
// convalescent: boys convalescing. 763 boys in the school, 512 became ill.
// Source: Anonymous, "Influenza in a boarding school", British Medical Journal 1978; 1: 587 (PMC1603269),
// as tabulated in De Vries et al. (2006), A Course in Mathematical Biology, SIAM, ch. 9, and distributed in the
// R package "outbreaks" (reconhub/outbreaks, data/influenza_england_1978_school.RData).
// fit: least-squares fit of the SIR equations to in_bed (beta, gamma and the starting number infected I0 free;
// S0 = 763 - I0, R0 = 0 at day 0), done offline with scipy.optimize.least_squares; se = standard errors.
window.EPIDEMIC_DATA = {
  school: {
    N: 763, ill: 512, start: "1978-01-22",
    inBed: [3, 8, 26, 76, 225, 298, 258, 233, 189, 128, 68, 29, 14, 4],
    convalescent: [0, 0, 0, 0, 9, 17, 105, 162, 176, 166, 150, 85, 47, 20],
    fit: { beta: 1.788, gamma: 0.456, I0: 2.09, betaSE: 0.106, gammaSE: 0.019, R0: 3.92, R0SE: 0.19, rmse: 16.0 }
  }
};
