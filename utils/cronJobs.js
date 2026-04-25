import cron from "node-cron";
import { activateTodaysMovies, syncBoxOfficeRevenues, syncUpcomingMovies } from "../services/syncUpcomingMovies.js";

// cron.schedule("0 4 * * *" , () => {
//     syncUpcomingMovies();
// })

// cron.schedule("* * * * *" , () => {
//     syncUpcomingMovies();
// })

// cron.schedule('0 12 * * 1', () => {
//     syncBoxOfficeRevenues();
// });

// cron.schedule("* 2 * * *" , () => {
//     activateTodaysMovies();
// }) 

cron.schedule("0 0 * * *", activateTodaysMovies);

cron.schedule("0 4 * * *", syncUpcomingMovies);

// cron.schedule("0 12 * * 1", syncBoxOfficeRevenues);