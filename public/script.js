const modal = $(".modal");
const modalBtn = $(".modalBtn");
const canvas = document.getElementById("canvas");
let xAxis,
    yAxis,
    drawPing = null;

if (canvas) {
    const context = canvas.getContext("2d");
    const signCanvas = document.querySelector('input[name="signeture"]');
    canvas.addEventListener("mousedown", (event) => {
        xAxis = event.pageX - canvas.offsetLeft;
        yAxis = event.pageY - canvas.offsetTop;

        drawStart();

        if (!drawPing) {
            drawPing = setInterval(draw, 1);
        }
    });

    canvas.addEventListener("mousemove", (event) => {
        xAxis = event.pageX - canvas.offsetLeft;
        yAxis = event.pageY - canvas.offsetTop;
    });

    canvas.addEventListener("mouseup", () => {
        drawEnd();
    });

    const drawStart = () => {
        context.strokeStyle = "black";
        context.lineCap = "round";
        context.lineJoin = "round";
        context.beginPath();
        context.moveTo(xAxis, yAxis);
    };
    const draw = () => {
        context.lineTo(xAxis, yAxis);
        context.stroke();
    };

    const drawEnd = () => {
        clearInterval(drawPing);
        drawPing = null;
        context.closePath();
        signCanvas.value = canvas.toDataURL();
    };
}

modalBtn.on("click", () => {
    modal.fadeOut(500);
});
