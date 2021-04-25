const errModal = $(".errModal");
const errModalBtn = $(".errModalBtn");
const canvas = document.getElementById("canvas");
let xAxis,
    yAxis,
    drawPing = null;

if (canvas) {
    const context = canvas.getContext("2d");
    const signCanvas = document.querySelector('input[name="signeture"]');
    canvas.addEventListener("mousedown", (event) => {
        xAxis = event.clientX - canvas.offsetLeft;
        yAxis = event.clientY - canvas.offsetTop;

        drawStart();

        if (!drawPing) {
            drawPing = setInterval(draw, 1);
        }
    });

    canvas.addEventListener("mousemove", (event) => {
        xAxis = event.clientX - canvas.offsetLeft;
        yAxis = event.clientY - canvas.offsetTop;
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

//visibility of modals
errModalBtn.on("click", () => {
    errModal.fadeOut(500);
});
