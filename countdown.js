class Countdown {
    static timeinterval;
    static total = 0;

    static getTotal() {
        return this.total;
    };
    
    static initializeClock(endtime) {
        function updateClock() {
            Countdown.total = Date.parse(endtime) - Date.parse(new Date());
            if (Countdown.total <= 0) {
                clearInterval(Countdown.timeinterval);
                Countdown.total = 0;
            }
        }

        updateClock();
        this.timeinterval = setInterval(updateClock, 1000);
    };
    
    static start() {
        const currentTime = Date.parse(new Date());
        const deadline = new Date(currentTime + 13 * 60 * 1000 + 37 * 1000);
        this.initializeClock(deadline);
    };

    static stop(){
        clearInterval(this.timeinterval);
        this.total = 0;
    };
  
};

module.exports = Countdown;