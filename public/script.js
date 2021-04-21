const canvas = document.getElementById("canvas");
if (canvas) {
    const context = canvas.getContext("2d");
    const signCanvas = document.querySelector('input[name="signeture"]');
    canvas.addEventListener("mousedown", (event) => {
        let xAxis = event.clientX - canvas.offsetLeft;
        let yAxis = event.clientY - canvas.offsetTop;
        console.log("click x", xAxis);
        console.log("click y", yAxis);
        context.beginPath();
        context.moveTo(xAxis, yAxis);

        canvas.addEventListener("mousemove", function draw(event) {
            let xAxis = event.clientX - canvas.offsetLeft;
            let yAxis = event.clientY - canvas.offsetTop;
            console.log("position x", xAxis);
            console.log("position y", yAxis);
            context.lineTo(xAxis, yAxis);
            context.stroke();

            canvas.addEventListener("mouseup", () => {
                canvas.removeEventListener("mousemove", draw);
                signCanvas.value = canvas.toDataURL();
            });
        });
    });
}
