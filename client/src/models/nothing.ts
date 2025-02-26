// complex systems with low-level access
class PlumbingSystem {
    setPressure(v: number) {}
    turnOn() {}
    turnOff() {}
}
class ElectricalSystem {
    setVoltage(v: number) {}
    turnOn() {}
    turnOff() {}
} 

// facade class, a simplified wrapper
class House {

    // complex systems as dependancies
    private plumbing = new PlumbingSystem();
    private electrical = new ElectricalSystem();

    // simplified operation of those complex systems
    public turnOnSystems() {
        this.plumbing.setPressure(500);
        this.plumbing.turnOn();
        this.electrical.setVoltage(120);
        this.electrical.turnOn();
    }
}