// ======== SAMPLE DATA (books, memberships, users) =========
const books = [
    { id: 1, name: "Java Basics", author: "James Gosling", serial: "B101", category: "Programming" },
    { id: 2, name: "Python Guide", author: "Guido van Rossum", serial: "P202", category: "Programming" },
    { id: 3, name: "SQL Master", author: "C. Date", serial: "S303", category: "Database" },
    { id: 4, name: "Computer Networks", author: "Tanenbaum", serial: "N404", category: "Networking" }
];

let memberships = [];   // {no, name, start, end}
let users = [];         // {name, pass, role}

// currently logged user
let currentUser = null;
let currentRole = null;

// for flow of book issue/return/fine
let selectedBook = null;   // from search
let activeLoan = null;     // {book, issueDate, dueDate, serial}
let pendingFine = 0;


// ======== UTILS =========
function show(id) {
    document.querySelectorAll(".page").forEach(p => p.style.display = "none");
    document.getElementById(id).style.display = "block";
}

function switchPage(id) {
    // menu se page change
    show(id);
}

function setError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.innerText = msg || "";
}

function getRadioValue(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : null;
}

function formatDate(dateObj) {
    return dateObj.toISOString().split("T")[0];
}


// ======== LOGIN / LOGOUT =========
function login() {
    const name = document.getElementById("loginName").value.trim();
    const pass = document.getElementById("loginPass").value.trim();
    const role = document.getElementById("loginRole").value;

    let ok = true;
    if (!name) { setError("errLoginName", "Name is required"); ok = false; } else setError("errLoginName", "");
    if (!pass) { setError("errLoginPass", "Password is required"); ok = false; } else setError("errLoginPass", "");

    if (!ok) return;

    currentUser = name;
    currentRole = role;

    document.getElementById("welcomeTitle").innerText =
        `Welcome ${name} (${role.toUpperCase()})`;

    // admin access
    document.getElementById("adminOnly").style.display = (role === "admin") ? "block" : "none";

    show("menuPage");
}

function logout() {
    currentUser = null;
    currentRole = null;
    location.reload();
}


// ======== BOOK AVAILABLE (SEARCH) =========
function searchBooks() {
    const name = document.getElementById("searchName").value.trim().toLowerCase();
    const category = document.getElementById("searchCategory").value;

    if (!name && !category) {
        setError("errSearchMain", "Enter book name or select category");
        return;
    }
    setError("errSearchMain", "");

    const tbody = document.getElementById("searchResults");
    tbody.innerHTML = "";

    const header = `<tr>
        <th>Name</th><th>Author</th><th>Serial</th><th>Select</th>
    </tr>`;
    tbody.insertAdjacentHTML("beforeend", header);

    const filtered = books.filter(b => {
        const matchName = name ? b.name.toLowerCase().includes(name) : true;
        const matchCat = category ? b.category === category : true;
        return matchName && matchCat;
    });

    if (filtered.length === 0) {
        tbody.insertAdjacentHTML("beforeend",
            `<tr><td colspan="4">No books found</td></tr>`);
        return;
    }

    filtered.forEach(b => {
        const row = `<tr>
            <td>${b.name}</td>
            <td>${b.author}</td>
            <td>${b.serial}</td>
            <td>
              <input type="radio" name="bookSelect" value="${b.id}"
                     onchange="selectBook(${b.id})">
            </td>
        </tr>`;
        tbody.insertAdjacentHTML("beforeend", row);
    });
}

function selectBook(id) {
    selectedBook = books.find(b => b.id === id) || null;

    if (selectedBook) {
        // pre-fill issue form
        document.getElementById("issueBookName").value = selectedBook.name;
        document.getElementById("issueAuthor").value = selectedBook.author;

        const today = new Date();
        const issueDateStr = formatDate(today);
        document.getElementById("issueDate").value = issueDateStr;

        const due = new Date();
        due.setDate(due.getDate() + 15);
        document.getElementById("issueReturnDate").value = formatDate(due);
    }
}


// ======== BOOK ISSUE =========
function confirmIssue() {
    setError("errIssueBook", "");
    setError("errIssueDate", "");
    setError("errReturnDate", "");
    document.getElementById("msgIssue").innerText = "";

    if (!selectedBook) {
        setError("errIssueBook", "Select a book from 'Book Available' first");
        return;
    }

    const bookName = document.getElementById("issueBookName").value.trim();
    const issueDateStr = document.getElementById("issueDate").value;
    const returnDateStr = document.getElementById("issueReturnDate").value;

    let ok = true;

    if (!bookName) {
        setError("errIssueBook", "Book name required");
        ok = false;
    }

    if (!issueDateStr) {
        setError("errIssueDate", "Issue date required");
        ok = false;
    } else {
        const todayStr = formatDate(new Date());
        if (issueDateStr < todayStr) {
            setError("errIssueDate", "Issue date cannot be before today");
            ok = false;
        }
    }

    if (!returnDateStr) {
        setError("errReturnDate", "Return date required");
        ok = false;
    } else if (issueDateStr) {
        const issueDate = new Date(issueDateStr);
        const retDate = new Date(returnDateStr);
        const maxDate = new Date(issueDateStr);
        maxDate.setDate(maxDate.getDate() + 15);

        if (retDate < issueDate || retDate > maxDate) {
            setError("errReturnDate",
                "Return date must be between issue date and 15 days ahead");
            ok = false;
        }
    }

    if (!ok) return;

    // Save active loan (single loan demo)
    activeLoan = {
        book: selectedBook,
        issueDate: issueDateStr,
        dueDate: returnDateStr,
        serial: selectedBook.serial
    };

    // pre-fill return form fields
    document.getElementById("retBookName").value = activeLoan.book.name;
    document.getElementById("retAuthor").value = activeLoan.book.author;
    document.getElementById("retSerial").value = activeLoan.serial;
    document.getElementById("retIssueDate").value = activeLoan.issueDate;

    document.getElementById("msgIssue").innerText = "Book issued successfully.";
}


// ======== RETURN BOOK =========
function processReturn() {
    setError("errRetBook", "");
    setError("errRetSerial", "");
    setError("errRetActual", "");
    document.getElementById("msgReturn").innerText = "";
    document.getElementById("msgFine").innerText = "";
    setError("errFine", "");

    if (!activeLoan) {
        setError("errRetBook", "No active loan found. Issue a book first.");
        return;
    }

    const bookName = document.getElementById("retBookName").value.trim();
    const serial = document.getElementById("retSerial").value.trim();
    const actualDateStr = document.getElementById("retActualDate").value;

    let ok = true;

    if (!bookName) {
        setError("errRetBook", "Book name required");
        ok = false;
    }

    if (!serial) {
        setError("errRetSerial", "Serial number required");
        ok = false;
    } else if (serial !== activeLoan.serial) {
        setError("errRetSerial", "Serial number does not match issued book");
        ok = false;
    }

    if (!actualDateStr) {
        setError("errRetActual", "Actual return date required");
        ok = false;
    }

    if (!ok) return;

    const dueDate = new Date(activeLoan.dueDate);
    const actualDate = new Date(actualDateStr);

    const diffDays = Math.floor((actualDate - dueDate) / (1000*60*60*24));
    pendingFine = diffDays > 0 ? diffDays * 10 : 0;  // ₹10 per late day

    // Fill fine page
    document.getElementById("fineBookName").value = activeLoan.book.name;
    document.getElementById("fineAmount").value = pendingFine;
    document.getElementById("finePaidChk").checked = false;
    document.getElementById("fineRemarks").value = "";

    document.getElementById("msgReturn").innerText =
        "Return processed. Check Fine Pay page.";

    show("finePay");
}


// ======== FINE PAY =========
function confirmFine() {
    setError("errFine", "");
    document.getElementById("msgFine").innerText = "";

    const paid = document.getElementById("finePaidChk").checked;

    if (pendingFine > 0 && !paid) {
        setError("errFine",
            "Pending fine exists. Please tick 'Fine Paid' checkbox to complete transaction.");
        return;
    }

    // all details already populated except Fine Paid & Remarks
    document.getElementById("msgFine").innerText =
        "Return book transaction completed successfully.";
    activeLoan = null;
    pendingFine = 0;
}


// ======== MEMBERSHIP =========
function addMembership() {
    setError("errMemName", "");
    setError("errMemStart", "");
    setError("errMemDur", "");
    document.getElementById("msgMemAdd").innerText = "";

    const name = document.getElementById("memName").value.trim();
    const start = document.getElementById("memStartDate").value;
    const dur = getRadioValue("memDur");

    let ok = true;
    if (!name) { setError("errMemName", "Member name required"); ok = false; }
    if (!start) { setError("errMemStart", "Start date required"); ok = false; }
    if (!dur) { setError("errMemDur", "Select duration"); ok = false; }

    if (!ok) return;

    const num = "MEM" + Math.floor(Math.random()*90000 + 10000);
    const startDate = new Date(start);
    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + parseInt(dur));

    memberships.push({
        no: num,
        name,
        start: start,
        end: formatDate(endDate)
    });

    document.getElementById("msgMemAdd").innerText =
        `Membership created. Number: ${num}`;
}

function updateMembership() {
    setError("errUpdMemNo", "");
    setError("errUpdAction", "");
    document.getElementById("msgMemUpd").innerText = "";

    const no = document.getElementById("updMemNo").value.trim();
    const action = getRadioValue("updAction");

    let ok = true;
    if (!no) { setError("errUpdMemNo", "Membership number required"); ok = false; }
    if (!action) { setError("errUpdAction", "Select action"); ok = false; }

    if (!ok) return;

    const mem = memberships.find(m => m.no === no);
    if (!mem) {
        setError("errUpdMemNo", "Membership not found");
        return;
    }

    if (action === "cancel") {
        mem.end = formatDate(new Date());  // today
        document.getElementById("msgMemUpd").innerText = "Membership cancelled.";
    } else {
        const extraMonths = (action === "extend6") ? 6 : 12;
        const endDate = new Date(mem.end);
        endDate.setMonth(endDate.getMonth() + extraMonths);
        mem.end = formatDate(endDate);
        document.getElementById("msgMemUpd").innerText =
            `Membership extended till ${mem.end}.`;
    }
}


// ======== ADD / UPDATE BOOK (ADMIN) =========
function addBook() {
    setError("errAddBookType", "");
    setError("errAddBookName", "");
    setError("errAddBookAuthor", "");
    setError("errAddBookSerial", "");
    document.getElementById("msgAddBook").innerText = "";

    const type = getRadioValue("addBookType");
    const name = document.getElementById("addBookName").value.trim();
    const author = document.getElementById("addBookAuthor").value.trim();
    const serial = document.getElementById("addBookSerial").value.trim();

    let ok = true;
    if (!type) { setError("errAddBookType", "Select new or existing"); ok = false; }
    if (!name) { setError("errAddBookName", "Book name required"); ok = false; }
    if (!author) { setError("errAddBookAuthor", "Author required"); ok = false; }
    if (!serial) { setError("errAddBookSerial", "Serial required"); ok = false; }

    if (!ok) return;

    // For assignment, we just push in array (no DB)
    books.push({
        id: books.length + 1,
        name,
        author,
        serial,
        category: "Programming"
    });

    document.getElementById("msgAddBook").innerText =
        `Book ${type === "new" ? "added" : "record updated / added"} successfully.`;
}

function updateBook() {
    setError("errUpdBookType", "");
    setError("errUpdBookName", "");
    setError("errUpdBookAuthor", "");
    setError("errUpdBookSerial", "");
    document.getElementById("msgUpdBook").innerText = "";

    const type = getRadioValue("updBookType");
    const name = document.getElementById("updBookName").value.trim();
    const author = document.getElementById("updBookAuthor").value.trim();
    const serial = document.getElementById("updBookSerial").value.trim();

    let ok = true;
    if (!type) { setError("errUpdBookType", "Select new or existing"); ok = false; }
    if (!name) { setError("errUpdBookName", "Book name required"); ok = false; }
    if (!author) { setError("errUpdBookAuthor", "Author required"); ok = false; }
    if (!serial) { setError("errUpdBookSerial", "Serial required"); ok = false; }

    if (!ok) return;

    const b = books.find(x => x.serial === serial);
    if (!b) {
        document.getElementById("msgUpdBook").innerText =
            "Book not found. (For assignment, we just show this message.)";
        return;
    }

    b.name = name;
    b.author = author;
    document.getElementById("msgUpdBook").innerText = "Book updated successfully.";
}


// ======== USER MANAGEMENT (ADMIN) =========
function saveUser() {
    setError("errUserType", "");
    setError("errUserName", "");
    setError("errUserPass", "");
    document.getElementById("msgUserMgmt").innerText = "";

    const type = getRadioValue("userType");
    const name = document.getElementById("userMgmtName").value.trim();
    const pass = document.getElementById("userMgmtPass").value.trim();
    const role = document.getElementById("userMgmtRole").value;

    let ok = true;
    if (!type) { setError("errUserType", "Select new or existing"); ok = false; }
    if (!name) { setError("errUserName", "Name required"); ok = false; }
    if (!pass) { setError("errUserPass", "Password required"); ok = false; }

    if (!ok) return;

    const existing = users.find(u => u.name === name);
    if (type === "new") {
        if (existing) {
            document.getElementById("msgUserMgmt").innerText =
                "User already exists. (Updated password instead.)";
            existing.pass = pass;
            existing.role = role;
        } else {
            users.push({ name, pass, role });
            document.getElementById("msgUserMgmt").innerText = "New user created.";
        }
    } else {
        if (!existing) {
            document.getElementById("msgUserMgmt").innerText = "User not found.";
        } else {
            existing.pass = pass;
            existing.role = role;
            document.getElementById("msgUserMgmt").innerText = "User updated.";
        }
    }
}
